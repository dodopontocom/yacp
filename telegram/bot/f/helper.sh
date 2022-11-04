#!/bin/bash

# Helpers

helper.validate_vars() {
  local vars_list=($@)
        
  for v in $(echo ${vars_list[@]}); do
    export | grep ${v} > /dev/null
    result=$?
    if [[ ${result} -ne 0 ]]; then
      echo "Dependency of ${v} is missing"
	    echo "Please, check ${v} variable in ${BASEDIR}/../.env file"
      echo "You must fill all environment variable values"
      echo "Exiting..."
      exit -1
    fi
  done
}

helper.get_api() {
	
  local tmp_folder current_version check_new_version

  tmp_folder=$(mktemp -d)
  check_new_version=$(curl -sS ${SHELLBOT_VERSION_RAW_URL} | grep VERSÃO | grep -o [0-9].*)
  [[ -f ${BASEDIR}/ShellBot.sh ]] && \
    current_version=$(cat ${BASEDIR}/ShellBot.sh | grep VERSÃO | grep -o [0-9].*) || \
    current_version="0"

  if [[ "${current_version}" != "${check_new_version}" ]]; then

    git clone ${SHELLBOT_GIT_URL} ${tmp_folder} > /dev/null

    cp ${tmp_folder}/ShellBot.sh ${BASEDIR}/
    rm -fr ${tmp_folder}
  fi
  rm -fr ${tmp_folder}
}