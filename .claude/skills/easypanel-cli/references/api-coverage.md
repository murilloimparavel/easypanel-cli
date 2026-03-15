# EasyPanel CLI — API Coverage

## Methods covered by CLI (37/65 = 57%)

| Method | CLI Command |
|--------|-------------|
| `listProjects` | `ep projects list` |
| `createProject` | `ep projects create` |
| `inspectProject` | `ep projects inspect` |
| `destroyProject` | `ep projects destroy` |
| `createAppService` | `ep services create` / `ep deploy *` |
| `deployFromImage` | `ep deploy image` |
| `deployFromGit` | `ep deploy git` |
| `deployFromDockerfile` | `ep deploy dockerfile` |
| `updateEnv` | `ep services env set` |
| `updateResources` | `ep services resources` |
| `startService` | `ep services start` |
| `stopService` | `ep services stop` |
| `restartService` | `ep services restart` |
| `deployService` | `ep services redeploy` |
| `destroyAppService` | `ep services destroy` |
| `createRedis` | `ep db redis create` |
| `inspectRedis` | `ep db redis inspect` |
| `destroyDBService` | `ep db destroy` |
| `createMySQL` | `ep db mysql create` |
| `createPostgres` | `ep db postgres create` |
| `getServiceStats` | `ep services stats` |
| `getAdvancedStats` | `ep monitor stats` |
| `getSystemStats` | `ep monitor system` / `ep status` |
| `getDockerTaskStats` | `ep monitor docker` |
| `getServiceLogs` | `ep services logs` |
| `getLogStreamUrlWithOptions` | `ep services logs --follow` |
| `searchLogs` | `ep services logs --search` |
| `getBuildStatus` | `ep services build-status` |
| `waitForDeploy` | `ep deploy * --wait` |
| `addDomain` | `ep domains add` |
| `removeDomain` | `ep domains remove` |
| `listDomains` | `ep domains list` |
| `validateDomain` | `ep domains validate` |
| `getSSLCertificate` | `ep domains ssl status` |
| `requestSSLCertificate` | `ep domains ssl enable` |
| `renewSSLCertificate` | `ep domains ssl renew` |
| `dockerImageCleanup` | `ep docker cleanup` |
| `dockerBuilderCachePrune` | `ep docker prune` |
| `restartEasyPanelService` | `ep system restart easypanel` |
| `restartTraefikService` | `ep system restart traefik` |
| `getServerIPAddress` | `ep system ip` |
| `getPanelDomain` | `ep system domain` |
| `getSystemInfo` | `ep system info` |
| `performHealthCheck` | `ep monitor health` |
| `getUser` | `ep whoami` |

## HIGH priority gaps (no CLI command yet)

| Method | Description | Suggested command |
|--------|-------------|-------------------|
| `updateRedisPassword` | Rotate Redis password | `ep db redis password <proj> <name> --password <new>` |
| `getSystemServiceLogs` | EasyPanel/Traefik logs | `ep system logs [easypanel\|traefik] --follow` |
| `activateLicense` | Activate license key | `ep license activate --key <key>` |

## MEDIUM priority gaps

| Method | Description |
|--------|-------------|
| `getServiceStatus` | System service health status |
| `getMonitorTableData` | Consolidated monitoring dashboard |
| `getLicensePayload` | License details |

## Internal methods (no CLI needed)

`authenticate`, `ensureAuthenticated`, `handleError`, `shouldInvalidateCache`,
`clearCache`, `getCacheStats`, `setCacheEnabled`, `setCacheTTL`, `setPersistentCache`,
`query`, `mutate`, `getLogStreamUrl`, `getUpgradeSuggestion`, `getPlanInfo`
