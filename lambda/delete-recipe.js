const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    try {
        const recipeId = event.pathParameters?.id;
        
        if (!recipeId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Recipe ID is required' })
            };
        }

        await dynamodb.send(new DeleteCommand({
            TableName: 'recipes',
            Key: {
                id: recipeId
            }
        }));

        return {
            statusCode: 204,
            headers
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to delete recipe' })
        };
    }
};