#!/bin/sh
# Override DNS to use Google public DNS
# ECS awsvpc mode allows /etc/resolv.conf modification at runtime
# even though per-container dnsServers is not supported.
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 8.8.4.4" >> /etc/resolv.conf
echo "options ndots:5" >> /etc/resolv.conf

exec "$@"
