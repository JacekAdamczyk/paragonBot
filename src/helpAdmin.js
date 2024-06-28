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

6. **!feedback [yes/no] [details]**
   - **Description:** Provide feedback on whether the materials provided were helpful. Include details if the answer is 'no'.
   - **Usage:** \`!feedback yes\` or \`!feedback no The material did not cover advanced scalping techniques\`

7. **!reviewfeedback**
   - **Description:** Review user feedback on the provided materials.
   - **Usage:** \`!reviewfeedback\`

8. **!clearfeedback**
   - **Description:** Clear all feedback from the system.
   - **Usage:** \`!clearfeedback\`

9. **!deletefeedback [feedbackId]**
   - **Description:** Delete specific feedback identified by its unique feedback ID.
   - **Usage:** \`!deletefeedback a1b2c3d4-5678-90ab-cdef-1234567890ab\`

10. **!help**
   - **Description:** Display this help message.
   - **Usage:** \`!help\`
`;

export default helpAdminText;
