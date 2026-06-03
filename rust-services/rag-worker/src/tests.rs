#[cfg(test)]
mod tests {
    use crate::config::Config;
    use std::env;

    #[test]
    fn test_config_missing_key() {
        env::remove_var("ANYTHINGLLM_API_KEY");
        let config = Config::from_env();
        assert!(config.is_err());
        assert_eq!(
            config.unwrap_err(),
            "ANYTHINGLLM_API_KEY environment variable is not set"
        );
    }

    #[test]
    fn test_config_present() {
        env::set_var("ANYTHINGLLM_API_KEY", "test-key-123");
        env::set_var("ANYTHINGLLM_API_URL", "http://test-url/api/v1");
        
        let config = Config::from_env();
        assert!(config.is_ok());
        let cfg = config.unwrap();
        assert_eq!(cfg.anythingllm_api_key, "test-key-123");
        assert_eq!(cfg.anythingllm_api_url, "http://test-url/api/v1");
        assert_eq!(cfg.rabbitmq_url, "amqp://guest:guest@rabbitmq:5672");
    }
}
