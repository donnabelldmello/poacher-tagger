package edu.usc.teamcore.tagger.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@Configuration
@ConfigurationProperties("tagging")
public class TaggingConfig {

	/** The minimum box size. */
	private Long boxAreaThreshold;
	
	/** The minimum box size. */
	private Long boxPixelThreshold;
	
	/** The buffer around the box. */
	private Integer boxAreaBuffer;
	
	/** The size after which ignore calculating next bounding box. */
	private Integer boxAreaMaxSize;

	/** The videos directory. */
	private String videosDir;

	/** The output directory. */
	private String outputDir;

	/** The options. */
	private List<Option> options;

	/** The user options. */
	private List<UserOption> userOptions;

	/** The input videos. */
	private List<Video> videos;

	/** The labels. */
	private List<Label> labels;

	@Data
	public static class Label {

		/** The label name. */
		private String name;

		/** The label color. */
		private String color;

		/** The display name for the color. */
		private String colorText;

	}

	@Data
	@EqualsAndHashCode
	public static class Video {

		/** The video jpeg directory. */
		private String directory;

		/** The total number of frames in the video. */		
		private Integer numFrames;

		/** Whether the video file is accessible. */
		private Boolean isAccessible;

	}

	@Data
	public static class Option {

		private String name;
		private OptionMode mode;
		private String inputFile;
		private String outputFile;

		public static enum OptionMode {
			LABEL, REVIEW;
		}

	}

	@Data
	public static class UserOption {

		private String name;
		private List<String> options;

	}

}
