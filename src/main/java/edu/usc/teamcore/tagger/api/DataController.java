package edu.usc.teamcore.tagger.api;

import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;

import edu.usc.teamcore.tagger.config.TaggingConfig;
import edu.usc.teamcore.tagger.config.TaggingConfig.Option;
import edu.usc.teamcore.tagger.config.TaggingConfig.Video;
import edu.usc.teamcore.tagger.service.BoundingBoxesManager;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/data")
public class DataController {

	private static final String LABEL = "Label";
	private static final String REVIEW = "Review";

	public static final Set<Video> reviewedVideos = Collections.synchronizedSet(new LinkedHashSet<>());

	private Map<String, ReentrantLock> fileLocks;
	private Map<String, String> optionInputs;
	private Map<String, String> optionOutputs;

	@Autowired
	private TaggingConfig taggingConf;
	
	@Autowired
	private BoundingBoxesManager boxManager;

	@PostConstruct
	public void init() throws Exception {
		fileLocks = new HashMap<>();
		optionInputs = new HashMap<>();
		optionOutputs = new HashMap<>();
		for (Option option : taggingConf.getOptions()) {
			optionInputs.put(option.getName(), option.getInputFile());
			optionOutputs.put(option.getName(), option.getOutputFile());
		}
		generateReviewedVideos();
	}

	private void generateReviewedVideos() throws Exception {
		Set<String> accessibleVideos = Files.list(Paths.get(taggingConf.getVideosDir())).map(path -> path.getFileName().toString()).collect(Collectors.toSet());
		Set<Video> videos =
			Files.readAllLines(Paths.get(taggingConf.getOutputDir() + optionOutputs.get(REVIEW)))
				 .stream()
				 .map(line -> {
					 String[] tokens = line.split(",");
					 String fileName = tokens[0].replaceAll("\"", "");
					 Video video = new Video();
					 video.setDirectory(fileName);
					 video.setNumFrames(findNumberOfFrames(fileName));
					 video.setIsAccessible(accessibleVideos.contains(fileName));
					 return video;
				 })
				 .collect(Collectors.toSet());
		reviewedVideos.addAll(videos);
	}

	private synchronized ReentrantLock lockFor(String fileName) {
		if (!fileLocks.containsKey(fileName)) {
			fileLocks.put(fileName, new ReentrantLock());
		}
		return fileLocks.get(fileName);
	}

	/**
	 * Saves a labeled entry.
	 */
	@RequestMapping(method = RequestMethod.POST)
	public void postData(@RequestHeader("X-fileName") String fileName, @RequestHeader("X-userAgent") String userAgent,
			@RequestBody String data) throws IOException {
		String outputFileName = taggingConf.getOutputDir() + optionOutputs.get(LABEL);
		lockFor(outputFileName).lock();
		try {
			FileWriter fileWriter = new FileWriter(outputFileName, true);
			CSVWriter writer = new CSVWriter(fileWriter);
			String[] values = new String[4];
			values[0] = fileName;
			values[1] = new Date().toString();
			values[2] = userAgent;
			values[3] = data;
			writer.writeNext(values);
			writer.close();
			log.info("Label data submitted: {} -- {}", fileName, data);
		}
		finally {
			lockFor(outputFileName).unlock();
		}
	}

	/**
	 * Saves a reviewed entry.
	 */
	@RequestMapping(method = RequestMethod.POST, value = "/review")
	public void postReviewData(@RequestHeader("X-fileName") String fileName,
			@RequestHeader("X-entryTime") String entryTime, @RequestHeader("X-optionName") String optionName,
			@RequestHeader("X-userAgent") String userAgent, @RequestBody String data) throws IOException {
		String outputFileName = taggingConf.getOutputDir() + optionOutputs.get(optionName);
		lockFor(outputFileName).lock();
		try {
			FileWriter fileWriter = new FileWriter(outputFileName, true);
			CSVWriter writer = new CSVWriter(fileWriter);
			String[] values = new String[5];
			values[0] = fileName;
			values[1] = entryTime;
			values[2] = new Date().toString();
			values[3] = userAgent;
			values[4] = data;
			writer.writeNext(values);
			writer.close();
			log.info("{} data submitted: {} -- {}", optionName, fileName, data);

			if (REVIEW.equals(optionName)) {
				Video video = new Video();
				video.setDirectory(fileName);
				video.setNumFrames(findNumberOfFrames(fileName));
				video.setIsAccessible(true);
				reviewedVideos.add(video);
			}
		}
		finally {
			lockFor(outputFileName).unlock();
		}
	}

	private Integer findNumberOfFrames(String fileName) {
		return
			taggingConf
				.getVideos()
				.stream()
				.filter(v -> v.getDirectory().equals(fileName))
				.collect(Collectors.toList())
				.get(0)
				.getNumFrames();
	}

	/**
	 * Returns a list of labeled entries to review.
	 */
	@RequestMapping(method = RequestMethod.GET, value =  "/list")
	public List<String> getDataList(@RequestHeader("X-fileName") String fileName,
			@RequestHeader("X-optionName") String optionName) throws IOException {
		String inputFileName = taggingConf.getOutputDir() + optionInputs.get(optionName);
		lockFor(inputFileName).lock();
		try {
			List<String> dataList =
				Files.readAllLines(Paths.get(inputFileName))
					 .stream()
					 .filter(line -> line.startsWith("\"" + fileName))
					 .map(line -> line.split(",")[1].replaceAll("\"", ""))
					 .collect(Collectors.toList());
				return dataList;
		}
		finally {
			lockFor(inputFileName).unlock();
		}
	}

	/**
	 * Returns a labeled entry to review.
	 */
	@RequestMapping(method = RequestMethod.GET)
	public String getDataList(@RequestHeader("X-fileName") String fileName,
			@RequestHeader("X-entryTime") String entryTime, @RequestHeader("X-optionName") String optionName)
			throws IOException {
		String inputFileName = taggingConf.getOutputDir() + optionInputs.get(optionName);
		lockFor(inputFileName).lock();
		try (CSVReader reader = new CSVReader(new FileReader(inputFileName))) {
			String [] nextLine;
			while ((nextLine = reader.readNext()) != null) {
				if (nextLine[0].equals(fileName) && nextLine[1].equals(entryTime)) {
					for (int i = 2; i < nextLine.length; i++) {
						if (nextLine[i].startsWith("{")) { // Identify JSON column
							return nextLine[i];
						}
					}
					throw new IllegalArgumentException("No entry found for " + fileName + " at " + entryTime);
				}
			}
			throw new IllegalArgumentException("No entry found for " + fileName + " at " + entryTime);
		}
		finally {
			lockFor(inputFileName).unlock();
		}
	}
	
	/**
	 * Returns a labeled entry to review.
	 */
	@RequestMapping(method = RequestMethod.GET, value =  "/box")
	public String getBoxPosition(@RequestHeader("bufferSize") String bufferSize, 
			@RequestHeader("prevFilename") String prevFilename, @RequestHeader("currFilename") String currFilename, 
			@RequestHeader("bounds") String bounds) throws IOException {
		
		String prevFile = taggingConf.getVideosDir() + prevFilename;
		String currFile = taggingConf.getVideosDir() + currFilename;
		return boxManager.getTranslatedBoxVal(prevFile, currFile, bounds, Integer.parseInt(bufferSize));
	}

}
