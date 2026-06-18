#!/bin/bash
exec 3<>/dev/tcp/localhost/9000
printf 'GET /auth/health/ready HTTP/1.1\r\nHost:localhost\r\nConnection:close\r\n\r\n' >&3
head -c 512 <&3 | grep -q 'UP'
