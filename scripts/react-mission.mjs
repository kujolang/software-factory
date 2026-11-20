#!/usr/bin/env node
import{reactMissionCommand}from'../factory/react-mission.mjs';try{const r=await reactMissionCommand(process.argv.slice(2));console.log(JSON.stringify(r,null,2));if(!r.ok)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
