package edu.usc.teamcore.tagger.dto;

import java.util.List;

import edu.usc.teamcore.tagger.config.TaggingConfig.Label;
import edu.usc.teamcore.tagger.config.TaggingConfig.Video;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
public class ConfigDTO {

	private Long boxAreaThreshold;
	private List<UserOption> options;
	private List<Video> videos;
	private List<Label> labels;
	private List<Video> reviewedVideos;

	@Data
	@AllArgsConstructor
	public static class UserOption {

		private String name;
		private String mode;

	}

}
