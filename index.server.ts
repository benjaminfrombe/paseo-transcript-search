import { registerSettingsFeed } from "./server/settings-feed/index";
import { contributeAgentTools } from "./server/native-tools";
import { displayFeed, displayPreferences } from "./shared/display";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { buildCensus, clearCensusCaches } from "./server/census";
import { getIndexStatus, stopIndexer } from "./server/indexer";
import { abortAllSearches, runSearch } from "./server/search";
import { clearTranscriptCaches } from "./server/transcripts";
import { attachItem, attachSearch, hostIdentity, indexStatus, listHistory, readExcerpt, restoreAgent, searchHistory } from "./shared/contracts";
import { attachItemFor, searchAttachments } from "./server/attach";
import { excerptForAgent } from "./server/excerpt";
import { serverId } from "./server/sessions";
import { restoreArchivedAgent } from "./server/restore-agent";

export default function contribute(server: PluginServerContext) {
  const removeTools = contributeAgentTools(server);
  const stopDisplayFeed = registerSettingsFeed(server, displayFeed, server.registerSettings(displayPreferences));
  server.handle(hostIdentity, async () => ({ serverId: await serverId(), protocol: 1 as const }));
  server.handle(restoreAgent, async ({ agentId }, { paseo }) => {
    await restoreArchivedAgent(agentId, paseo);
    return { agentId };
  });
  server.handle(listHistory, async () => {
    console.log(`[agents-history] DEBUG listHistory called`);
    const census = await buildCensus();
    // Literal search needs no index. Ranked search requests its own sync on demand.
    return census;
  });
  server.handle(searchHistory, (input) => {
    console.log(`[agents-history] DEBUG search q=${JSON.stringify(input.query)} mode=${input.mode} agents=${input.agentIds?.length}`);
    return runSearch(input).then((out) => {
      console.log(`[agents-history] DEBUG search done mode=${out.mode} fallback=${out.fallback ?? "-"} matches=${out.matches.length} searched=${out.searchedAgents} unsearchable=${out.unsearchableAgents.length} err=${out.error ? out.error.code : "-"}`);
      return out;
    });
  });
  server.handle(indexStatus, () => {
    console.log(`[agents-history] DEBUG indexStatus ${JSON.stringify(getIndexStatus())}`);
    return getIndexStatus();
  });
  server.handle(readExcerpt, ({ agentId, fileName, ...options }) => excerptForAgent(agentId, fileName, options));
  server.handle(attachSearch, ({ query }) => searchAttachments(query));
  server.handle(attachItem, (input) => attachItemFor(input));
  return async () => {
    stopDisplayFeed();
    removeTools();
    abortAllSearches();
    await stopIndexer();
    clearCensusCaches();
    clearTranscriptCaches();
  };
}
