<#
.SYNOPSIS
  Put secrets into Google Secret Manager and wire Cloud Run to reference them,
  without the value ever appearing in a chat transcript, a shell history, or a
  process argument list.

.DESCRIPTION
  The problem this solves: an AI assistant can only act on what it can read, and
  anything it can read is in its context and transcript. So the goal is NOT a
  safe way to hand it a key — it is for it never to need one.

  This script is the seam. Claude writes and maintains it; you run it. It
  prompts for each value locally, pipes it straight to `gcloud` over stdin, and
  wires Cloud Run to a secret *reference*. The value is never typed into chat,
  never passed as a command-line argument (argv is visible to other processes
  and lands in PowerShell history), and never stored as a plaintext env var on
  the service.

  Idempotent: re-run it any time to rotate a value. It creates the secret on
  first use and adds a new version afterwards; Cloud Run tracks `:latest`.

.PARAMETER Project
  GCP project id. Defaults to this app's project.

.EXAMPLE
  ./scripts/set-secrets.ps1
  ./scripts/set-secrets.ps1 -Only GEMINI_API_KEY     # rotate just one

.NOTES
  Written for BusinessFlow Studio but not exercised against the live project —
  the author had no production credentials, by design. Read it before running.
#>
param(
  [string]$Project = 'sitebuilder-b2ee6',
  [string]$Service = 'businessflow',
  [string]$Region = 'us-central1',
  [string[]]$Only
)

$ErrorActionPreference = 'Stop'

# env var name -> Secret Manager secret id
$SECRETS = [ordered]@{
  'GEMINI_API_KEY' = 'gemini-api-key'
  'SMTP_PASS'      = 'smtp-pass'
}

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# --- preflight ---------------------------------------------------------------

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud not found on PATH. Install the Google Cloud SDK first."
}

Write-Step "Enabling Secret Manager API (no-op if already on)"
gcloud services enable secretmanager.googleapis.com --project $Project | Out-Null

# The runtime service account is what reads the secret at request time. When the
# service uses the project default, this comes back empty and we fall back to the
# default compute SA.
Write-Step "Resolving the Cloud Run runtime service account"
$sa = gcloud run services describe $Service --region $Region --project $Project `
  --format 'value(spec.template.spec.serviceAccountName)' 2>$null
if ([string]::IsNullOrWhiteSpace($sa)) {
  $projNum = gcloud projects describe $Project --format 'value(projectNumber)'
  $sa = "$projNum-compute@developer.gserviceaccount.com"
  Write-Host "    (service uses the default compute SA)"
}
Write-Host "    $sa"

# --- store each secret -------------------------------------------------------

$targets = $SECRETS.GetEnumerator() | Where-Object { -not $Only -or $Only -contains $_.Key }
if (-not $targets) { throw "Nothing to do: -Only matched none of $($SECRETS.Keys -join ', ')" }

$wired = @()

foreach ($entry in $targets) {
  $envName = $entry.Key
  $secretId = $entry.Value

  Write-Step "$envName"
  # -AsSecureString keeps it off the screen and out of PSReadLine history.
  $secure = Read-Host "    Paste the value for $envName (input hidden)" -AsSecureString
  $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

  if ([string]::IsNullOrWhiteSpace($plain)) {
    Write-Host "    skipped (empty)" -ForegroundColor Yellow
    continue
  }
  # Gmail shows app passwords as 4 groups of 4; the actual value has no spaces.
  $plain = $plain -replace '\s', ''

  $exists = gcloud secrets describe $secretId --project $Project 2>$null
  if (-not $exists) {
    Write-Host "    creating secret '$secretId'"
    gcloud secrets create $secretId --replication-policy automatic --project $Project | Out-Null
  }

  # Piped over stdin, never as an argument — argv is readable by other processes.
  Write-Host "    adding a new version"
  $plain | gcloud secrets versions add $secretId --data-file=- --project $Project | Out-Null

  # Scrub the plaintext from this process as soon as it is no longer needed.
  $plain = $null
  [System.GC]::Collect()

  gcloud secrets add-iam-policy-binding $secretId `
    --member "serviceAccount:$sa" `
    --role roles/secretmanager.secretAccessor `
    --project $Project | Out-Null

  $wired += "$envName=$secretId`:latest"
}

if (-not $wired) { Write-Host "`nNothing was set." -ForegroundColor Yellow; exit 0 }

# --- point the service at the references -------------------------------------

Write-Step "Wiring Cloud Run to the secret references"
# --update-secrets MERGES, like --update-env-vars. Never use --set-secrets here:
# it replaces the whole block.
gcloud run services update $Service --region $Region --project $Project `
  --update-secrets ($wired -join ',') | Out-Null

Write-Step "Done. Configured on the service (names only, no values):"
gcloud run services describe $Service --region $Region --project $Project `
  --format 'value(spec.template.spec.containers[0].env[].name)'

Write-Host "`nRotate later by re-running this script; Cloud Run follows :latest." -ForegroundColor Green
