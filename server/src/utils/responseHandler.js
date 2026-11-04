export const successResponse = (res, data, statusCode = 200) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: true, data }));
};

export const errorResponse = (res, error, statusCode = 500) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, error }));
};

export const notFoundResponse = (res, message = 'Not found') => {
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, error: message }));
}
 

export const badRequestResponse = (res, message = 'Bad request') => {
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, error: message }));
};