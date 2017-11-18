package edu.usc.teamcore.tagger.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Data
@Configuration
@ConfigurationProperties("security")
public class SecurityConfig {

	private List<User> users;

	@Data
	public static class User {

		private String name;
		private String password;

	}

}
