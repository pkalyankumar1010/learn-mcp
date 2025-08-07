"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = __importDefault(require("zod"));
const promises_1 = __importDefault(require("node:fs/promises"));
const server = new mcp_js_1.McpServer({
    name: "test-server",
    version: "0.0.1",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    }
});
server.resource("users", "users://all", {
    description: "get all users data from the database",
    title: "All Users",
    mimeType: "application/json",
}, async (uri) => {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then(m => m.default);
    return {
        contents: [
            {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(users, null, 2)
            }
        ],
    };
});
server.resource("user-details", new mcp_js_1.ResourceTemplate("users://{userId}/profile", { list: undefined }), {
    description: "gett all users data from the database",
    title: "All Users",
    mimeType: "application/json",
}, async (uri, { userId }) => {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then(m => m.default);
    const user = users.find(u => u.id === parseInt(userId));
    if (user === null || user === undefined) {
        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: "application/json",
                    text: JSON.stringify({ error: "User not found" })
                }
            ],
        };
    }
    return {
        contents: [
            {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(user, null, 2)
            }
        ],
    };
});
server.tool("create-user", "Create a new user in the database", {
    name: zod_1.default.string(),
    email: zod_1.default.string(),
    address: zod_1.default.string(),
    phone: zod_1.default.string(),
}, {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
}, async (params) => {
    try {
        const id = await createUser(params);
        return {
            content: [
                {
                    type: "text",
                    text: "Succesfully created a user."
                }
            ]
        };
    }
    catch (_a) {
        return {
            content: [
                {
                    type: "text",
                    text: "An error occurred while creating the user."
                }
            ]
        };
    }
});
server.prompt("generate-fake-user", "Generate a fake user profile", {
    name: zod_1.default.string(),
}, ({ name }) => {
    return {
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `Generate a fake user profile with the name ${name}. The profile should include a name, email, address, and phone number.`
                }
            }]
    };
});
async function createUser(user) {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then(m => m.default);
    const id = users.length + 1; // Simple ID generation logic
    users.push({ id, ...user });
    await promises_1.default.writeFile("./src/data/users.json", JSON.stringify(users, null, 2));
    return id;
}
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main();
//# sourceMappingURL=server.js.map