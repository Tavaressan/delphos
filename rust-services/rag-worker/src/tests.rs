#[cfg(test)]
mod tests {
    use crate::config::Config;
    use std::env;
    use std::sync::Mutex;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    #[test]
    fn test_config_missing_key() {
        let _guard = ENV_MUTEX.lock().unwrap();
        let original_val = env::var("ANYTHINGLLM_API_KEY").ok();
        env::remove_var("ANYTHINGLLM_API_KEY");
        
        let config = Config::from_env();
        assert!(config.is_err());
        assert_eq!(
            config.unwrap_err(),
            "ANYTHINGLLM_API_KEY environment variable is not set"
        );

        if let Some(val) = original_val {
            env::set_var("ANYTHINGLLM_API_KEY", val);
        }
    }

    #[test]
    fn test_config_present() {
        let _guard = ENV_MUTEX.lock().unwrap();
        let original_key = env::var("ANYTHINGLLM_API_KEY").ok();
        let original_url = env::var("ANYTHINGLLM_API_URL").ok();

        env::set_var("ANYTHINGLLM_API_KEY", "test-key-123");
        env::set_var("ANYTHINGLLM_API_URL", "http://test-url/api/v1");
        
        let config = Config::from_env();
        assert!(config.is_ok());
        let cfg = config.unwrap();
        assert_eq!(cfg.anythingllm_api_key, "test-key-123");
        assert_eq!(cfg.anythingllm_api_url, "http://test-url/api/v1");
        assert_eq!(cfg.rabbitmq_url, "amqp://guest:guest@rabbitmq:5672");

        if let Some(val) = original_key {
            env::set_var("ANYTHINGLLM_API_KEY", val);
        } else {
            env::remove_var("ANYTHINGLLM_API_KEY");
        }
        if let Some(val) = original_url {
            env::set_var("ANYTHINGLLM_API_URL", val);
        } else {
            env::remove_var("ANYTHINGLLM_API_URL");
        }
    }
}
