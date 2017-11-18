package edu.usc.teamcore.tagger.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configurers.provisioning.InMemoryUserDetailsManagerConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;

@Configuration
@EnableWebSecurity
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {

	private static final String USER = "USER";

	@Autowired
	private SecurityConfig securityConfig;
	
	@Override
	protected void configure(AuthenticationManagerBuilder auth) throws Exception {
		final InMemoryUserDetailsManagerConfigurer<AuthenticationManagerBuilder> authBuilder = auth.inMemoryAuthentication();
		securityConfig.getUsers().forEach(user -> {
			authBuilder.withUser(user.getName()).password(user.getPassword()).roles(USER);
		});
	}

	@Override
	protected void configure(HttpSecurity http) throws Exception {
		http.authorizeRequests().anyRequest().fullyAuthenticated();
		http.httpBasic();
		http.csrf().disable();
	}

}
