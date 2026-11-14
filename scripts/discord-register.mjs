// Registers the slash commands (src/lib/discord-commands.json) with ONE Discord server (guild commands update instantly).
// Needs DISCORD_BOT_TOKEN (secret), DISCORD_APP_ID and DISCORD_GUILD_ID. Run from the "Register Discord commands" GitHub workflow.
// Never prints the token.
import fs from "node:fs";
import path from "node:path";

const { DISCORD_BOT_TOKEN: token, DISCORD_APP_ID: app, DISCORD_GUILD_ID: guild } = process.env;
if (!token || !app || !guild) { console.error("Missing DISCORD_BOT_TOKEN, DISCORD_APP_ID or DISCORD_GUILD_ID."); process.exit(1); }
if (!/^[0-9]{5,25}$/.test(app) || !/^[0-9]{5,25}$/.test(guild)) { console.error("DISCORD_APP_ID and DISCORD_GUILD_ID must be numeric ids."); process.exit(1); }

const commands = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "lib", "discord-commands.json"), "utf8"));
const res = await fetch(`https://discord.com/api/v10/applications/${app}/guilds/${guild}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "content-type": "application/json" },
  body: JSON.stringify(commands),
});
const text = await res.text();
if (!res.ok) {
  console.error(`Discord returned ${res.status}. ${res.status === 401 ? "The bot token is wrong or was reset: copy a fresh one." : res.status === 403 ? "The app is not in that server yet: invite it with the applications.commands scope." : ""}`);
  console.error(text.slice(0, 500));
  process.exit(1);
}
const registered = JSON.parse(text);
console.log(`Registered ${registered.length} commands: ${registered.map((c) => "/" + c.name).join(", ")}`);
