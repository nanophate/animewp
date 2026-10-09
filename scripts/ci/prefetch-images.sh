#!/bin/sh
# GitHub-hosted runners share Docker Hub's anonymous pull quota. Pre-tag the
# Docker Official Images from Docker's verified ECR Public gallery, so wp-env
# and PHPCS can use the exact conventional tags they already expect.
#
# A failed mirror is not silently considered a successful test: the following
# Docker command will still pull from Hub and fail normally if unavailable.
set -eu
for image in "$@"; do
  case "$image" in
    php:8.0-cli|php:8.3-cli|mariadb:lts|phpmyadmin:latest|composer:2) ;;
    *) echo "Disallowed CI image: $image" >&2; exit 2 ;;
  esac
  if docker image inspect "$image" >/dev/null 2>&1; then
    printf 'CI image already cached: %s\n' "$image"
    continue
  fi
  mirror="public.ecr.aws/docker/library/$image"
  if docker pull "$mirror"; then
    docker tag "$mirror" "$image"
    printf 'Cached Docker Official Image for CI: %s\n' "$image"
  else
    printf '::warning::Public ECR image unavailable: %s; Docker Hub fallback remains enabled\n' "$image"
  fi
  # Public ECR unauthenticated requests are rate-limited to 1 TPS off AWS.
  sleep 2
done
