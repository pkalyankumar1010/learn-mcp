import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import fs from "node:fs/promises";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";
const server  = new McpServer({
		name : "test-server",
		version: "0.0.1",
		capabilities: {
				resources : {},
				tools : {},
				prompts: {},
		}
})

server.resource(
		"users",
		"users://all",{
				description: "get all users data from the database",
				title : "All Users",
				mimeType: "application/json",
		},
		async uri => {
				const users = await import("./data/users.json",{
				with :{type : "json"}
				}).then(m => m.default);
				return {    
								contents : [
								{
										uri: uri.href,
										mimeType: "application/json",
										text: JSON.stringify(users, null, 2)
								}
								],
				}
		}
)

server.resource("user-details", new ResourceTemplate("users://{userId}/profile",{list : undefined}),{
		
				description: "gett all users data from the database",
				title : "All Users",
				mimeType: "application/json",
		},
		async (uri , { userId }) => {
				const users = await import("./data/users.json",{
						with :{type : "json"}
				}).then(m => m.default);
				const user = users.find(u => u.id === parseInt(userId as string));
				if (user === null || user === undefined) {
				return {    
						contents : [
								{
										uri: uri.href,
										mimeType: "application/json",
										text: JSON.stringify({error: "User not found"})
								}
						],
				}
				}
				return {    
						contents : [
								{
										uri: uri.href,
										mimeType: "application/json",
										text: JSON.stringify(user, null, 2)
								}
						],
				}
		}
		
)

server.tool("create-user", "Create a new user in the database", {
		name : z.string(),
		email: z.string(),
		address: z.string(),
		phone: z.string(),

},{
		title: "Create User",
		readOnlyHint : false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: true

}, async (params) =>  {
		try {
				const id = await createUser(params)
				return {
						content : [
								{
										type: "text",
										text: "Succesfully created a user."
								}
						]
				}

		} catch  {
				return {
						content : [
								{
										type: "text",
										text: "An error occurred while creating the user."
								}
						]
				}
		}
})

server.tool("create-random-user", "Create a random user in the database", {
		title: "Create Random User",
		readOnlyHint : false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: true
},  async () => {
	const res = await server.server.request({
		method: "sampling/createMessage",
		params: {
			messages: [{
				role: "user",
				content: {
					type: "text",
					text: "Generate a random user profile with a name, email, address, and phone number. Return the profile in JSON format.	with no additional text so that it can be parsed easily by JSon.parse()"
				}
			}],
			maxTokens: 1024,
		}
	}, CreateMessageResultSchema)

	if (res.content.type !== "text") {
		return {
			content: [
				{
					type: "text",
					text: "An error occurred while generating the random user."
				}
			]
		}
	}
	try {
		const fakeUser = JSON.parse(res.content.text.trim()
		.replace(/^```json/gm, "")
		.replace(/^```/gm, "")
		.trim())
		console.log("Generated User:", fakeUser);
		const id = await createUser(fakeUser);
			return {
				content: [
					{
						type: "text",
						text: `User ${id} created successfully.`
					}
				]
			}

	} catch {
				return {
			content: [
				{
					type: "text",
					text: "Failed to parse the generated user profile. Please ensure the response is in valid JSON format."
				}
			]
			
		}
	}
})

server.prompt("generate-fake-user", "Generate a fake user profile", {
		name: z.string(),
} , ({name}) => {
		return {
			messages : [{
				role: "user",
				content: {
					type: "text",
					text: `Generate a fake user profile with the name ${name}. The profile should include a name, email, address, and phone number.`
				}
			}]
		}

}
)
async function createUser(user: { name: string, email: string, address: string, phone: string }) {
		const users = await import("./data/users.json",{
				with :{type : "json"}
		}).then(m => m.default);
		const id  = users.length + 1; // Simple ID generation logic
		users.push({ id, ...user })
		await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2))
		return id;
}
async function main() {
		const transport = new StdioServerTransport()
		await server.connect(transport)
}

main()