function HttpError(message, statusCode) {
    const error = new Error(message);
    error.name = 'HttpError';
    error.statusCode = statusCode;
    return error;
}


const errorHandler = (error, request, response) => {

    console.error('❌ Caught error:', error.message);

    if (error.name === 'HttpError' && error.statusCode) {
        return response.status(error.statusCode).json({ error: error.message });
    }

    return response.status(500).json({ error: 'Internal Server Error' });
}

module.exports = {errorHandler, HttpError}