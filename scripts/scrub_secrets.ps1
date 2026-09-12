<#
PowerShell helper: Non-destructive secret removal helper
Runs locally to create a branch, remove `functions/.env` from Git index, commit the removal and push a branch.
It DOES NOT rewrite history. It prints guidance for history-scrub commands (git-filter-repo / BFG) that must be run by a maintainer with backup.
#>

param(
    [string]$BranchName = 'remediation/remove-committed-secrets'
)

Write-Host "== Secret scrub helper =="
Write-Host "This script will perform a non-destructive removal of 'functions/.env' from git tracking and push a branch."

# Ensure we are in repo root
$cwd = Get-Location
Write-Host "Working directory: $cwd"

Write-Host "Creating branch: $BranchName"
git checkout -b $BranchName

Write-Host "Removing functions/.env from index (keeps local copy)."
git rm --cached functions/.env 2>$null

Write-Host "Committing removal"
git commit -m "chore(secrets): remove committed functions/.env" 2>$null

Write-Host "Pushing branch to origin"
git push -u origin $BranchName

Write-Host ""
Write-Host "NEXT STEPS (manual, destructive):"
Write-Host "  1) Rotate any compromised credentials immediately (Gmail, API keys, etc)."
Write-Host "  2) Add .env to .gitignore if not already present and commit."
Write-Host "  3) Coordinate with repo maintainers to run history scrub (git-filter-repo or BFG)."
Write-Host "     Example git-filter-repo command (run in a mirror clone):"
Write-Host "       pip install git-filter-repo"
Write-Host "       git clone --mirror https://github.com/your-org/your-repo.git repo-mirror"
Write-Host "       cd repo-mirror"
Write-Host "       git filter-repo --path functions/.env --invert-paths"
Write-Host "       git push --force --all && git push --force --tags"
Write-Host "  4) After history rewrite, all contributors must reclone the repository."

Write-Host "Done. If you want, run this script from the repository root in PowerShell:"
Write-Host "  .\\scripts\\scrub_secrets.ps1"
