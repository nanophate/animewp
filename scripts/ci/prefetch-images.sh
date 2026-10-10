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
    php:8.0-cli|php:8.3-cli|mariadb:lts|phpmyadmin:latest|composer:2|wordpress:php8.0|wordpress:cli-php8.0|wordpress:php8.3|wordpress:cli-php8.3) ;;
    *) echo "Disallowed CI image: $image" >&2; exit 2 ;;
  esac
  if docker image inspect "$image" >/dev/null 2>&1; then
    printf 'CI image already cached: %s\n' "$image"
    continue
  fi
  mirror="public.ecr.aws/docker/library/$image"
  attempt=1
  # ECR Public anonymous requests from a shared Actions egress IP can exceed
  # their 1 TPS ceiling when multiple CI jobs pull at the same time.
  while ! docker image inspect "$mirror" >/dev/null 2>&1; do
    if docker pull "$mirror"; then
      break
    fi
    if [ "$attempt" -ge 4 ]; then
      printf '::warning::Public ECR unavailable for %s; Docker Hub fallback remains enabled\n' "$image"
      break
    fi
    sleep "$((attempt * 8))"
    attempt=$((attempt + 1))
  done
  if docker image inspect "$mirror" >/dev/null 2>&1; then
    docker tag "$mirror" "$image"
    printf 'Cached Docker Official Image for CI: %s\n' "$image"
  fi
  # Reduce ECR Public request bursts across successive image pulls.
  sleep 3
done
