#!/bin/bash
# YoXperience Scheduler Wrapper — uses Railway-injected env vars to bypass Hermes masking

# railway run executes from project root, so cd to gateway dir
cd /Users/jonahk/YoXperience-Platform/packages/gateway

export DATABASE_URL="$DATABASE_PUBLIC_URL"
export LM_STUDIO_URL="http://localhost:1234/v1"
export LM_MODEL="gemma-4-26b-a4b-it-uncensored-abliterix-mlx-int5-affine"
export ANALYSIS_INTERVAL_MIN="10080"

# Critical: unset Railway's internal PG* vars
unset PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

exec node --import tsx src/worker/scheduler.ts "$@"
