#!/usr/bin/env node
// Explicit trusted prefetch/isolated verification/mission commands, never host package installation.
import{nodePackageCommand}from'../factory/node-package-command.mjs';try{const result=await nodePackageCommand(process.argv.slice(2));console.log(JSON.stringify(result,null,2));if(result?.ok===false)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
