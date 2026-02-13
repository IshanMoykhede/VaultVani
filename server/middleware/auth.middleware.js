import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    // console.log("i was called");
    const { token } = req.cookies; // ✅ fixed typo
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET); // ✅ no await
    req.id = decodedToken.id; // ✅ attach to req.user instead of req.body

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default auth;
