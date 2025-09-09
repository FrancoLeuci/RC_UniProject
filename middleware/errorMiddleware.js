function HttpError(message, statusCode) {
    const error = new Error(message);
    error.name = 'HttpError';
    error.statusCode = statusCode;
    return error;
}


const errorHandler = (error, req, res, next) => {

    console.error('❌ Caught error:', error);

    if (error.name === 'HttpError' && error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = {errorHandler, HttpError}