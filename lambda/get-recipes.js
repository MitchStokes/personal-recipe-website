const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    try {
        const searchQuery = event.queryStringParameters?.search || '';
        
        let params = {
            TableName: 'recipes'
        };

        // If search query exists, add filter expression
        if (searchQuery) {
            params.FilterExpression = 'contains(#name, :search) OR contains(content, :search)';
            params.ExpressionAttributeNames = {
                '#name': 'name'
            };
            params.ExpressionAttributeValues = {
                ':search': searchQuery
            };
        }

        const result = await dynamodb.send(new ScanCommand(params));
        
        // Sort by creation date (newest first)
        const sortedRecipes = result.Items.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(sortedRecipes)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch recipes' })
        };
    }
};