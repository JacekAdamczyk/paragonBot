const helpAdminText = `
**Available Commands:**

1. **!bot [query]**
   - **Description:** Search for educational materials related to the query.
   - **Usage:** \`!bot give me scalping lessons\`

2. **!add [messageLink]**
   - **Description:** Process and add new material from the provided message link (click on the material you want to add and use "copy link" and paste it here).
   - **Usage:** \`!add https://discord.com/channels/1234567890/0987654321/1122334455\`

3. **!edit [materialId] [field] [newValue]**
   - **Description:** Edit a specific field of the material identified by the material ID.
   - **Usage:** \`!edit f323d0fb-9617-412c-b6af-9e56ff6b4d86 keywords keyword one, another keyword, keyword3\`

4. **!view [messageLink]**
   - **Description:** View details of the material associated with the provided message link.
   - **Usage:** \`!view https://discord.com/channels/1234567890/0987654321/1122334455\`

5. **!delete [materialId]**
   - **Description:** Delete the material identified by the material ID.
   - **Usage:** \`!delete f323d0fb-9617-412c-b6af-9e56ff6b4d86\`

6. **!help**
   - **Description:** Display this help message.
   - **Usage:** \`!help\`
`;

export default helpAdminText;
