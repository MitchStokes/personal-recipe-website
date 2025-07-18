const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    try {
        const { id, name, content } = JSON.parse(event.body);
        
        if (!name || !content) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Name and content are required' })
            };
        }

        let recipe;
        
        if (id) {
            // Update existing recipe - first get the current recipe to preserve createdAt
            const getResult = await dynamodb.send(new GetCommand({
                TableName: 'recipes',
                Key: { id: id }
            }));
            
            if (!getResult.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Recipe not found' })
                };
            }
            
            recipe = {
                id: id,
                name: name.trim(),
                content: content.trim(),
                createdAt: getResult.Item.createdAt, // Preserve original creation date
                updatedAt: new Date().toISOString()
            };
        } else {
            // Create new recipe
            recipe = {
                id: uuidv4(),
                name: name.trim(),
                content: content.trim(),
                createdAt: new Date().toISOString()
            };
        }

        await dynamodb.send(new PutCommand({
            TableName: 'recipes',
            Item: recipe
        }));

        return {
            statusCode: id ? 200 : 201,
            headers,
            body: JSON.stringify(recipe)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create recipe' })
        };
    }
};