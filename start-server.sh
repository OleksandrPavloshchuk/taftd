#!/bin/bash

installIfAbsents() {
    if [[ ! -e "node_modules/$1" ]]; then npm install $1; fi
}

createLink() {
    if [[ -e "webapp/$1" || -L "webapp/$1" ]]; then
        rm webapp/$1
    fi
    cd webapp; ln -s ../node_modules/$1 $1; cd ..
}

if [[ ! -e "node_modules" ]]; then mkdir node_modules; fi
installIfAbsents 'ws'
installIfAbsents 'bootstrap'
installIfAbsents 'bootstrap-icons'
createLink 'bootstrap'
createLink 'bootstrap-icons'

WS_PORT=9443 HTTPS_PORT=8443 node server/main.js
