#!/usr/bin/env node
import{reactStaticCommand}from'../factory/react-static.mjs';try{const result=await reactStaticCommand(process.argv.slice(2));console.log(JSON.stringify(result,null,2));if(result.ok===false)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
