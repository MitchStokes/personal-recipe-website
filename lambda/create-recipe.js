const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new AWS.DynamoDB.DocumentClient();

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
        const { name, content } = JSON.parse(event.body);
        
        if (!name || !content) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Name and content are required' })
            };
        }

        const recipe = {
            id: uuidv4(),
            name: name.trim(),
            content: content.trim(),
            createdAt: new Date().toISOString()
        };

        await dynamodb.put({
            TableName: 'recipes',
            Item: recipe
        }).promise();

        return {
            statusCode: 201,
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