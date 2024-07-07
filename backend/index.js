require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'chatbot.sqlite'
});

const Conversation = sequelize.define('Conversation', {
    userId: DataTypes.STRING,
    message: DataTypes.TEXT,
    response: DataTypes.TEXT,
});

sequelize.sync();

const systemPrompt = `
You are a helpful hotel booking assistant for Bot9 Palace. Your role is to assist users in booking rooms at our resort. Here's how you should behave:

1. Greet the user and ask how you can help with their room booking.
2. When asked about room options, use the 'get_room_options' function to fetch and present available rooms.
3. Provide details about room amenities, prices, and availability when asked.
4. Ask for which type of room the user would like to book and how many nights they plan to stay.
5. Provide a summary of the booking details along with the price and ask the user to confirm.
6. once and only if the user confirms, ask for their full name and email address to complete the booking.
7. Use the 'book_room' function to book the room with the provided details.
8. Always be polite, professional, and helpful.
9. If you don't have information about something, politely say so and offer to find out.
10. End conversations by thanking the user and asking if there's anything else you can help with.

Remember, your main goal is to help users book rooms efficiently and pleasantly.
`;

async function getRoomOptions() {
    const response = await fetch('https://bot9assignement.deno.dev/rooms');
    return await response.json();
}

async function bookRoom(roomId, fullName, email, nights) {
    const response = await fetch('https://bot9assignement.deno.dev/book', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, fullName, email, nights }),
    });
    return await response.json();
}

app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;

    try {
        const conversation = await Conversation.findAll({
            where: { userId },
            order: [['createdAt', 'ASC']],
        });

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversation.map(c => ({ role: 'user', content: c.message })),
            ...conversation.map(c => ({ role: 'assistant', content: c.response })),
            { role: 'user', content: message },
        ];

        const functions = [
            {
                name: 'get_room_options',
                description: 'Get available room options',
                parameters: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'book_room',
                description: 'Book a room',
                parameters: {
                    type: 'object',
                    properties: {
                        roomId: { type: 'number' },
                        fullName: { type: 'string' },
                        email: { type: 'string' },
                        nights: { type: 'number' },
                    },
                    required: ['roomId', 'fullName', 'email', 'nights'],
                },
            },
        ];

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: messages,
            functions: functions,
            function_call: 'auto',
        });

        let responseMessage = response.choices[0].message.content;

        if (response.choices[0].message.function_call) {
            const functionName = response.choices[0].message.function_call.name;
            const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments);

            let functionResult;
            if (functionName === 'get_room_options') {
                functionResult = await getRoomOptions();
            } else if (functionName === 'book_room') {
                functionResult = await bookRoom(
                    functionArgs.roomId,
                    functionArgs.fullName,
                    functionArgs.email,
                    functionArgs.nights
                );
            }

            const secondResponse = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    ...messages,
                    response.choices[0].message,
                    {
                        role: 'function',
                        name: functionName,
                        content: JSON.stringify(functionResult),
                    },
                ],
            });

            responseMessage = secondResponse.choices[0].message.content;
        }

        await Conversation.create({
            userId,
            message,
            response: responseMessage,
        });

        res.json({ response: responseMessage });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});