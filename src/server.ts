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
});
 
// ...existing code...
server.tool("test-model", "Test if the model is responding correctly", {
    title: "Test Model",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
}, async () => {
    try {
        const res = await server.server.request({
            method: "sampling/createMessage",
            params: {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: "Please respond with: 'Hello, I am working!'"
                    }
                }],
                maxTokens: 128,
                temperature: 0
            }
        }, CreateMessageResultSchema);

        console.log("Raw model response:", res);

        if (!res?.content || res.content.type !== "text") {
            throw new Error("Invalid response format from model");
        }

        const response = res.content.text.trim();
        
        return {
            content: [{
                type: "text",
                text: `Model test result:\nResponse received: "${response}"\nModel is ${response ? "responding" : "not responding"}`
            }]
        };

    } catch (error) {
        console.error("Model test failed:", error);
        return {
            content: [{
                type: "text",
                text: `Model test failed: ${
                    typeof error === "object" && error !== null && "message" in error
                        ? (error as { message?: string }).message
                        : String(error)
                }\nPlease check if the model service is running and configured correctly.`
            }]
        };
    }
});
// ...existing code...
// ...existing code...
server.tool("create-random-user", "Create a random user in the database", {
    title: "Create Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
}, async () => {
    try {
        const sampleUser = {
            name: "John Smith",
            email: "john.smith@example.com",
            address: "123 Main St, Anytown, USA",
            phone: "+1-555-123-4567"
        };

        const res = await server.server.request({
            method: "sampling/createMessage",
            params: {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are a user profile generator. Create a random user profile following this exact JSON structure, but with different realistic values:
${JSON.stringify(sampleUser, null, 2)}
Return only the JSON object, no additional text or formatting.`
                    }
                }],
                maxTokens: 1024,
                temperature: 0.8,
                topP: 0.95
            }
        }, CreateMessageResultSchema);

        if (!res?.content || res.content.type !== "text") {
            throw new Error("Invalid response from model");
        }

        const cleanedJson = (res.content.text || "").trim();
        console.log("Raw model response:", cleanedJson);

        if (!cleanedJson) {
            throw new Error("Model returned empty response");
        }

        // Extract JSON if wrapped in code blocks
        const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : cleanedJson;

        try {
            const fakeUser = JSON.parse(jsonString);
            
            // Validate the user object
            const requiredFields = ["name", "email", "address", "phone"];
            for (const field of requiredFields) {
                if (typeof fakeUser[field] !== "string" || !fakeUser[field]) {
                    throw new Error(`Invalid or missing ${field}`);
                }
            }

            const id = await createUser(fakeUser);
            return {
                content: [{
                    type: "text",
                    text: `Created user ${id}: ${fakeUser.name}`
                }]
            };

        } catch (parseError) {
            console.error("JSON parsing failed:", parseError);
            console.error("Attempted to parse:", jsonString);
            const errorMsg = typeof parseError === "object" && parseError !== null && "message" in parseError ? (parseError as { message?: string }).message : String(parseError);
            throw new Error(`JSON parsing failed: ${errorMsg}`);
        }

    } catch (error) {
        console.error("Create random user failed:", error);
        return {
            content: [{
                type: "text",
                text: `Failed to create random user: ${
                    typeof error === "object" && error !== null && "message" in error
                        ? (error as { message?: string }).message
                        : String(error)
                }`
            }]
        };
    }
});
// ...existing code...

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