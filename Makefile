PHONY: purge_cache

purge_cache:
	-find  videocache/ -type f -print0 | xargs -t -0 rm