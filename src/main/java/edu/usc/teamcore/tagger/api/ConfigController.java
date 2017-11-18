package edu.usc.teamcore.tagger.api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import edu.usc.teamcore.tagger.config.TaggingConfig;
import edu.usc.teamcore.tagger.config.TaggingConfig.Option;
import edu.usc.teamcore.tagger.config.TaggingConfig.Video;
import edu.usc.teamcore.tagger.dto.ConfigDTO;
import edu.usc.teamcore.tagger.dto.ConfigDTO.UserOption;

@RestController
@RequestMapping("/config")
public class ConfigController {

	private static final String ADMIN = "admin";

	private Map<String, String> optionModes;

	@Autowired
	private TaggingConfig taggingConf;

	@PostConstruct
	public void init() {
		optionModes = new HashMap<>();
		for (Option option : taggingConf.getOptions()) {
			optionModes.put(option.getName(), option.getMode().name());
		}
	}

	@RequestMapping(method = RequestMethod.GET)
	public ConfigDTO getConfig() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		String name = auth.getName();
		List<UserOption> options =
			taggingConf.getUserOptions()
			   .stream().filter(userOption -> userOption.getName().equals(name))
			   .findFirst().get().getOptions()
			   .stream().map(option -> new UserOption(option, optionModes.get(option)))
			   .collect(Collectors.toList());

		ConfigDTO conf = new ConfigDTO();
		conf.setBoxAreaThreshold(taggingConf.getBoxAreaThreshold());
		conf.setOptions(options);
		conf.setVideos(taggingConf.getVideos());
		conf.setLabels(taggingConf.getLabels());
		if (ADMIN.equals(name)) {
			synchronized (DataController.reviewedVideos) {
				List<Video> reviewedVideos = DataController.reviewedVideos.stream().collect(Collectors.toList());
				conf.setReviewedVideos(reviewedVideos);
			}
		}
		return conf;
	}

}
