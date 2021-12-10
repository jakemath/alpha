#!/bin/bash
sudo -E docker-compose up -d --build --remove-orphans
sudo docker-compose logs -f -t --tail 300