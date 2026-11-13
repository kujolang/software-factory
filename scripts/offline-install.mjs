#!/usr/bin/env node
import{offlineCommand}from'../factory/offline-command.mjs';
try{const result=offlineCommand(process.argv.slice(2));console.log(JSON.stringify(result,null,2));if(result&&Object.hasOwn(result,'exitCode'))process.exitCode=result.exitCode??1;}catch(error){console.error(error.message);process.exitCode=1;}
