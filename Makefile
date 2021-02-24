.PHONY: install_deps purge_cache

install_deps:
	npm install
	luarocks --local --lua-version=5.1 build --only-deps

purge_cache:
	-find  videocache/ -type f -print0 | xargs -t -0 rm
