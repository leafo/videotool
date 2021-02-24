import config from require "lapis.config"

config "development", ->
  port 9090

config "production", ->
  port 10008
  code_cache "on"

  systemd {
    user: true
  }
