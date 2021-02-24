package = "videotool"
version = "dev-1"
source = {
   url = "https://github.com/leafo/videotool.git"
}

description = {
   homepage = "https://github.com/leafo/videotool",
   license = "MIT"
}

dependencies = {
  "moonscript",
  "lua-resty-http",
  "lapis ~> 1.8.3",
  "lapis-systemd ~> 1.0",
}

build = {
   type = "none",
}
