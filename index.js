const mysql = require('mysql');
const express = require('express');
const router = express.Router();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const dotenv = require("dotenv");

app = express();
dotenv.config({path: "./config.env"});

app.use(cors({
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    origin: [process.env.frontEndHost]
}));
app.use(express.json());
app.use(cookieParser());


app.use('/uploads/blogImage', express.static(path.join(__dirname, 'uploads/blogImage')));
app.use('/uploads/profilePhoto', express.static(path.join(__dirname, 'uploads/profilePhoto')));

const jwtPrivateKey = process.env.jwtPrivateKey;

//Creating database connection
const db = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
});

//Checking database connection
db.connect(function(err){
    if(err){
        console.log(err);
    }
    else{
    console.log("Connected to database");
    }
});

// db.end(function(err){
//     if(err){
//         console.log(err);
//     }
//     else{
//         console.log("disconnected");
//     }
// });

app.get("/api/dummyapi", function(req, res){
    console.log(db.state);
});

//Getting all blog category code starts
app.get("/api/blog/categoryList", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const q = `SELECT 
        CATEGORY_ID AS categoryID, 
        CATEGORY_NAME AS categoryName, 
        CATEGORY_DESCRIPTION AS categoryDescription
        FROM BLOG_CATEGORY`;
    db.query(q,function(err, result){
        if(err){
            res.json(err);
        }
        res.status(200).json(result);
    }); 
})
//Getting all blog category code starts


//User Registration code starts
app.post("/api/authorization/register", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const firstName = req.body.firstName;
    const middleName = req.body.middleName;
    const lastName = req.body.lastName;
    const username = req.body.username;
    const gender = req.body.gender;
    const dob = req.body.dob;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    let fullName;
    if(middleName === "" || middleName === null ||middleName === undefined){
        fullName = firstName + " " + lastName;
    }else{
        fullName = firstName + " " + middleName + " " + lastName;
    }
    let profilePhoto;
    if(gender === "Male"){
        profilePhoto = "Male.png";
    }
    else if(gender === "Female"){
        profilePhoto = "Female.jpg"
    }
    const q1 = `SELECT * FROM BLOG_USERS 
                WHERE USERNAME = ? 
                OR EMAIL_ADDRESS = ?`; 
    db.query(q1, [username, email], function(err, result){
        if(err){
            res.json(err)
        }
        else if(result.length){
            const q2 = "SELECT * FROM BLOG_USERS WHERE USERNAME = ?";
            db.query(q2, [username], function(err, result2){
                if(err){
                    res.json(err);
                }
                if(result2.length){
                    res.status(409).json("Username already used. Please choose another username");
                }
                else{
                    const q3 = "SELECT * FROM BLOG_USERS WHERE EMAIL_ADDRESS = ?";
                    db.query(q3, [email], function(err, result3){
                        if(err){
                            res.json(err);
                        }
                        if(result3.length){
                            res.status(409).json("Email address already exist!");
                        }
                    });
                }
            });            
        }
        else{
            if(password === confirmPassword){
                const q4 = `INSERT INTO BLOG_USERS 
                            (FIRST_NAME, 
                            MIDDLE_NAME, 
                            LAST_NAME, 
                            FULL_NAME, 
                            USERNAME, 
                            EMAIL_ADDRESS, 
                            GENDER, 
                            PASSWORD, 
                            DATE_OF_BIRTH, 
                            USER_PROFILE_PHOTO) 
                            VALUES (?)`;
                const values = [firstName,middleName,lastName,fullName,username,email,gender,password,dob,profilePhoto];
                db.query(q4, [values], function(err,result4){
                    if(err){
                        res.json(err);
                    }
                    res.status(200).json("User has been created successfully");
                });
            }
            else{
                res.status(401).json("Password and Confirm Password does not match!");
            }
        }
    });
});
//User Registration code ends


//User Login code starts
app.post("/api/authorization/login", function(req,res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const email = req.body.email;
    const loginPassword = req.body.password;
    const q1 = "SELECT * FROM BLOG_USERS WHERE EMAIL_ADDRESS = ?";
    db.query(q1, [email], function(err, result1){
        if(err){
            res.json(err);
        }
        if(result1.length === 0){
            res.status(401).json("Incorrect Email Address");
        }
        else{
            const q2 = `SELECT * FROM BLOG_USERS 
                        WHERE EMAIL_ADDRESS = ? 
                        AND PASSWORD = ?`;
            db.query(q2, [email, loginPassword], function(err, result2){
                if(err){
                    res.json(err);
                }
                if(result2.length === 0){
                    res.status(401).json("Incorrect Password");
                }
                else{
                    const token = jwt.sign({id: result2[0].USER_ID}, jwtPrivateKey);
                    res.cookie("jwt_access_token", token, {httpOnly: true});
                    const publicData = {
                        firstName: result2[0].FIRST_NAME,
                        middleName: result2[0].MIDDLE_NAME,
                        lastName: result2[0].LAST_NAME,
                        fullName: result2[0].FULL_NAME,
                        userID: result2[0]. USER_ID,
                        username: result2[0].USERNAME,
                        emailAddress: result2[0].EMAIL_ADDRESS,
                        gender: result2[0].GENDER,
                        dob: result2[0].DATE_OF_BIRTH,
                        profilePhoto: result2[0].USER_PROFILE_PHOTO, 
                        jwtToken: token
                    };
                    res.status(200).json(publicData);
                }
            });
        }
    });
});
//User Login code ends


//User Logout code starts
app.post("/api/authorization/logout", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    res.clearCookie("jwt_access_token");
    res.status(200).json("User has been logout successfully");
});
//User Logout code ends


//Delete Account code starts
app.delete("/api/authorization/deleteAccount/:userID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    const userID = req.params.userID;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(401).json("Not Authenticated");   
        }
        const q = "DELETE FROM BLOG_USERS WHERE USER_ID = ?";
        db.query(q, [userID], function(err, result){
            if(err){
                console.log(err);
                res.json(err);
            }
            res.clearCookie("jwt_access_token");
            res.status(200).json("Your account is deleted successfully.");
        });
    });
});
//Delete Account code ends


//Uploading Image
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const storageLocation = "./uploads/" + file.fieldname;
        cb(null,storageLocation);
    },
    filename: function (req, file, cb) {
        const fileName = Date.now() + file.originalname;    
        cb(null, fileName);
    }
  });
  
const upload = multer({ storage: storage });


//Uploading blog image code starts
app.post("/api/blogImage", upload.single('blogImage'), function(req, res){
    res.status(200).json(req.file);
});
//Uploading blog image code ends


//Adding blog post code starts
app.post("/api/blogPost/newPost/post", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const title = req.body.title;
    const postDescription = req.body.postDescription;
    const category = req.body.category;
    const imageDetail = req.body.imageDetail;
    if(imageDetail === ""){
        res.status(417).json("Please upload the image");
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const currentDate = new Date();
        const tableInsertValue = [title, postDescription, category, userInformation.id, imageDetail.filename, currentDate, "posted"]
        const q=`INSERT INTO BLOG_POST 
                (POST_TITLE, 
                POST_DESCRIPTION, 
                CATEGORY_ID, 
                USER_ID,
                POST_IMAGE_FILENAME, 
                POST_DATE_TIME, 
                POST_STATUS) 
                VALUES (?)`;
        db.query(q, [tableInsertValue], function(err, result){
            if(err){
                console.log(err);
            }
            res.status(200).json("Blog Post has been added successfully");
        });
    });
});
//Adding blog post code ends

//Get API for post information code starts
app.get("/api/blogPost/onlyPostInformation", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const q = `SELECT 
    POST.POST_ID AS postID, 
    POST.POST_TITLE AS postTitle, 
    POST.POST_DESCRIPTION AS postDescription, 
    POST.POST_IMAGE_FILENAME AS postImage, 
    POST.POST_DATE_TIME AS postDateTime, 
    CATEGORY.CATEGORY_ID AS categoryID, 
    CATEGORY.CATEGORY_NAME AS categoryName, 
    CATEGORY.CATEGORY_DESCRIPTION AS categoryDescription, 
    USERS.FULL_NAME AS userFullName, 
    USERS.USER_ID AS userID, 
    USERS.USERNAME AS username,
    USERS.USER_PROFILE_PHOTO AS userProfilePhoto
  FROM 
    BLOG_POST POST, 
    BLOG_CATEGORY CATEGORY, 
    BLOG_USERS USERS 
  WHERE 
    POST.USER_ID = USERS.USER_ID 
    AND POST.CATEGORY_ID = CATEGORY.CATEGORY_ID 
    AND POST.POST_STATUS = 'posted'`;

    db.query(q, function(err, result){
        if(err){
            res.json(err);
        }
        res.status(200).json(result);
    });

});
//Get API for post information code ends


//Deleting particular post code starts
app.delete("/api/blogPost/deletePost/:postID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const postID = req.params.postID;
        const userID = userInformation.id;
        const q = `DELETE FROM BLOG_POST 
                    WHERE POST_ID = ? 
                    AND USER_ID = ?`;
        db.query(q,[postID, userID], function(err, result){
            if(err){
                console.log(err);
            }
            res.status(200).json("Post has been deleted successfully");
        });
    });
});
//Deleting particular post code ends


//Updating the particular post code starts
app.put("/api/blogPost/updatePost/:postID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    const title = req.body.title;
    const postDescription = req.body.postDescription;
    const category = req.body.category;
    const imageDetail = req.body.imageDetail;
    if(!token){
        res.status(401).json("Not Authenticated");
    }

    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const postID = req.params.postID;
        const userID = userInformation.id;

        if(imageDetail == null){
            const q2 = `UPDATE BLOG_POST 
                SET 
                POST_TITLE = ?, 
                POST_DESCRIPTION = ?, 
                CATEGORY_ID = ?
                WHERE POST_ID = ? AND USER_ID = ?`;
                db.query(q2, [title, postDescription, category, postID, userID], function(err, result){
                    if(err){
                        res.json(err);
                    }
                    res.status(200).json("Post has been successfully updated");
                });
        }
        else{
            const q1 = `UPDATE BLOG_POST 
                SET 
                POST_TITLE = ?, 
                POST_DESCRIPTION = ?, 
                CATEGORY_ID = ?, 
                POST_IMAGE_FILENAME = ? 
                WHERE POST_ID = ? AND USER_ID = ?`;
                db.query(q1, [title, postDescription, category, imageDetail.filename, postID, userID], function(err, result){
                    if(err){
                        res.json(err);
                    }
                    res.status(200).json("Post has been successfully updated");
                });
        }    
    });
});
//Updating the particular post code starts


//Updating user info code starts

//Uploading profile picture code starts
app.post("/api/profilePhoto", upload.single('profilePhoto'), function(req, res){
    res.status(200).json(req.file);
});
//Uploading profile picture code starts


//Updating profile picture path in database code starts
app.put("/api/blogUser/update/profilePhoto/:userID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    const userID = req.params.userID;
    const imageDetail  = req.body.imageDetail;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        const q = `UPDATE BLOG_USERS
                    SET 
                    USER_PROFILE_PHOTO = ? 
                    WHERE USER_ID = ?`;
        db.query(q, [imageDetail.filename, userID], function(err, result){
            if(err){
                res.json(err);
            }
            res.status(200).json("Your Profile Photo is updated successfully");
        });
    });

});
//Updating profile picture path in database code ends


//Updating basic information code starts
app.put("/api/blogUser/update/basicInfo/:userID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    const firstName = req.body.firstName;
    const middleName = req.body.middleName;
    const lastName = req.body.lastName;
    const gender = req.body.gender;
    const dob = req.body.dob;
    const userID = req.params.userID;
    let fullName;
    if(middleName === "" || middleName === null ||middleName === undefined){
        fullName = firstName + " " + lastName;
    }else{
        fullName = firstName + " " + middleName + " " + lastName;
    }
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        const q1 = `SELECT * FROM BLOG_USERS    
                    WHERE USER_ID = ?
                    AND FIRST_NAME = ?
                    AND MIDDLE_NAME = ? 
                    AND LAST_NAME = ? 
                    AND FULL_NAME = ?
                    AND GENDER = ? 
                    AND DATE_OF_BIRTH = ? `;
        db.query(q1, [userID, firstName, middleName, lastName, fullName, gender, dob], function(err, result1){
            if(err){
                res.json(err);
            }
            if(result1.length){
                res.status(417).json("You have not updated any information");
            }
            else{
                const q2 = `UPDATE BLOG_USERS
                    SET 
                    FIRST_NAME = ?, 
                    MIDDLE_NAME = ?, 
                    LAST_NAME = ?, 
                    FULL_NAME = ?,
                    GENDER = ?, 
                    DATE_OF_BIRTH = ? 
                    WHERE USER_ID = ?`;
                db.query(q2, [firstName, middleName, lastName, fullName, gender, dob, userID], function(err, result2){
                if(err){
                    res.json(err);
                }
                res.status(200).json("Your Basic Information is updated successfully");
                });
            }
        });       
    });
});
//Updating basic information code ends


//Updating username and email address code starts
app.put("/api/blogUser/update/usernameEmail/:userID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    const username = req.body.username;
    const email = req.body.email;
    const userID = req.params.userID;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        const q1 = `SELECT * FROM BLOG_USERS 
                    WHERE USER_ID != ?
                    AND (USERNAME = ?
                    OR EMAIL_ADDRESS = ?)`;
        db.query(q1, [userID, username, email], function(err, result1){
            if(err){
                res.json(err);
            }
            if(result1.length){
                const q3 = `SELECT * FROM BLOG_USERS 
                    WHERE USER_ID != ?
                    AND USERNAME = ?`;
                db.query(q3, [userID, username], function(err, result3){
                    if(err){
                        res.json(err);
                    }
                    if(result3.length){
                        res.status(409).json("Username already used. Please choose another username");
                    }
                    else{
                        const q4 = `SELECT * FROM BLOG_USERS 
                            WHERE USER_ID != ?
                            AND EMAIL_ADDRESS = ?`;
                        db.query(q4, [userID, email], function(err, result4){
                            if(err){
                                res.json(err);
                            }
                            if(result4.length){
                                res.status(409).json("Email address already exist!");
                            }
                        });
                    }
                });
            }
            else{
                const q5 = `SELECT * FROM BLOG_USERS 
                            WHERE USER_ID = ?
                            AND USERNAME = ?
                            AND EMAIL_ADDRESS = ?`;
                db.query(q5, [userID, username, email], function(err, result5){
                    if(err){
                        res.json(err);
                    }
                    if(result5.length){
                        res.status(417).json("You have not updated any information");
                    }
                    else{
                        const q2 = `UPDATE BLOG_USERS
                                    SET 
                                    USERNAME = ?, 
                                    EMAIL_ADDRESS = ? 
                                    WHERE USER_ID = ?`;
                        db.query(q2, [username, email, userID], function(err, result2){
                        if(err){
                            res.json(err);
                        }
                        res.status(200).json("Your Email Address and Username is updated successfully");
                    });
                    }
                });    
            }    
        });        
    });
});
//Updating username and email address code starts


//Updating users password code starts
app.put("/api/blogUser/update/password/:userID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;;
    const confirmNewPassword = req.body.confirmNewPassword;
    const userID = req.params.userID;
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userID != userInformation.id){
            res.status(403).json("Not Authenticated");
        }
        const q1 = `SELECT * FROM BLOG_USERS
                    WHERE USER_ID = ?
                    AND PASSWORD = ?`;
        db.query(q1, [userID, oldPassword], function(err, result1){
            if(err){
                res.json(err);
            }
            if(result1.length === 0){
                res.status(401).json("You have entered wrong old password");
            }
            else{
                if(newPassword === confirmNewPassword){
                    const q3 = `SELECT * FROM BLOG_USERS
                                WHERE USER_ID = ?
                                AND PASSWORD = ?`;
                    db.query(q3, [userID, newPassword], function(err, result3){
                        if(err){
                            res.json(err);
                        }
                        if(result3.length){
                            res.status(401).json("New Password cannot be same as Old Password")
                        }
                        else {
                            const q2 = `UPDATE BLOG_USERS
                            SET
                            PASSWORD = ? 
                            WHERE USER_ID = ?`;
                            db.query(q2, [newPassword, userID], function(err, result2){
                                if(err){
                                    res.json(err);
                                }
                                res.status(200).json("Password has been updated successfully");
                            });
                        }    
                    });                    
                }
                else{
                    res.status(401).json("New Password and Confirm New Password does not match!");
                }
            }
        });
    });
});
//Updating users password code ends

//Updating user info code ends


//Adding new comment for particular post code starts
app.post("/api/blogPost/comment/newComment/:postID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const postID = req.params.postID;
    const currentDate = new Date(); 
    const newComment = req.body.newComment.trim();
    if(newComment === "" || newComment == null || newComment == undefined){
        res.status(406).json("Blank comment cannot be added.");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const userID = userInformation.id;
        const q = `INSERT INTO BLOG_POST_COMMENT
                (COMMENT_DESCRIPTION,
                POST_ID,
                COMMENT_DATE_TIME,
                USER_ID)
                VALUES (?)`;
        const values = [newComment, postID, currentDate, userID];
        db.query(q, [values], function(err,result){
            if(err){
                console.log(err);
                res.json(err);
            }
            res.status(200).json("Commented on the post successfully");
        });
    });
});
//Adding new comment for particular post code ends


//Updating the comment code starts
app.put("/api/blogPost/comment/updateComment/:commentID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const commentID = req.params.commentID;
    const currentDate = new Date(); 
    const updatedComment = req.body.updatedComment.trim();
    const userID = req.body.userID;
    if(updatedComment === "" || updatedComment == null || updatedComment == undefined){
        res.status(406).json("Blank comment cannot be added.");
    }
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userInformation.id != userID){
            res.status(401).json("Not Authenticated");
        }
        const q = `UPDATE BLOG_POST_COMMENT
                SET COMMENT_DESCRIPTION = ?,
                COMMENT_DATE_TIME = ?
                WHERE COMMENT_ID = ?`;
        db.query(q, [updatedComment, currentDate, commentID], function(err,result){
            if(err){
                console.log(err);
                res.json(err);
            }
            res.status(200).json("Comment on the post updated successfully");
        });
    });
});
//Updating the comment code ends


//Delete the comment code starts
app.delete("/api/blogPost/comment/deleteComment/:commentID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const commentID = req.params.commentID;
    const userID = req.body.userID;
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        if(userInformation.id != userID){
            res.status(401).json("Not Authenticated");
        }
        const q = `DELETE FROM BLOG_POST_COMMENT 
                WHERE COMMENT_ID = ?
                AND USER_ID = ?`;
        db.query(q, [commentID, userID], function(err,result){
            if(err){
                console.log(err);
                res.json(err);
            }
            res.status(200).json("Comment on the post deleted successfully");
        });
    });
});
//Delete the comment code starts


//Get API for comment code starts
app.get("/api/blogPost/postComment", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const q = `SELECT 
                COMMENT.COMMENT_ID AS commentID,
                COMMENT.COMMENT_DESCRIPTION AS commentDescription,
                COMMENT.COMMENT_DATE_TIME AS commentDateTime,
                POST.POST_ID AS postID,
                USERS.USER_ID AS userID,
                USERS.FULL_NAME AS userFullName, 
                USERS.USERNAME AS  username,
                USERS.USER_PROFILE_PHOTO AS userProfilePhoto
            FROM 
                BLOG_POST POST, 
                BLOG_POST_COMMENT COMMENT, 
                BLOG_USERS USERS 
            WHERE
            COMMENT.USER_ID = USERS.USER_ID
            AND COMMENT.POST_ID = POST.POST_ID`;

    db.query(q, function(err, result){
        if(err){
            res.json(err);
        }
        res.status(200).json(result);
    });
});
//Get API for comment code ends


//Liking the post code starts
app.post("/api/blogPost/like/newLike/:postID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const postID = req.params.postID;
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const userID = userInformation.id;
        const q = `INSERT INTO BLOG_LIKES
                (POST_ID,
                USER_ID)
                VALUES (?)`;
        const values = [postID, userID];
        db.query(q, [values], function(err,result){
            if(err){
                console.log(err);
                res.json(err);
            }
            res.status(200).json("Liked the post successfully");
        });
    });
});
//Liking the post code ends


//Unliking the post code starts
app.delete("/api/blogPost/unlikePost/:postID", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const token = req.body.token || req.cookies.jwt_access_token;  
    if(!token){
        res.status(401).json("Not Authenticated");
    }
    const postID = req.params.postID;
    jwt.verify(token, jwtPrivateKey, function(error, userInformation){
        const userID = userInformation.id;
        const q = `DELETE FROM BLOG_LIKES
                    WHERE POST_ID = ?
                    AND USER_ID = ?`;
        db.query(q, [postID, userID], function(err,result){
            if(err){
                console.log(err);
                res.json(err);
            }
            res.status(200).json("Unliked the post successfully");
        });
    });
});
//Unliking the post code ends


//Get API for likes code starts
app.get("/api/blogPost/postLike", function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    const q = `SELECT 
                LIKES.LIKE_ID AS likeID,
                POST.POST_ID AS postID,
                USERS.USER_ID AS userID,
                USERS.FULL_NAME AS userFullName, 
                USERS.USERNAME AS  username,
                USERS.USER_PROFILE_PHOTO AS userProfilePhoto
            FROM 
                BLOG_POST POST, 
                BLOG_LIKES LIKES, 
                BLOG_USERS USERS 
            WHERE
            LIKES.USER_ID = USERS.USER_ID
            AND LIKES.POST_ID = POST.POST_ID`;

    db.query(q, function(err, result){
        if(err){
            res.json(err);
        }
        res.status(200).json(result);
    });
});
//Get API for likes code ends


//Getting all blog post with all details  code starts
app.get("/api/blogPost/allPost", async function(req, res){
    if(db.state != 'authenticated'){
        db.connect();
    }
    var host = req.get('host');
    var fullHost = "http://" + host;
    try {
        const response1 = await axios.get(`${fullHost}/api/blogPost/onlyPostInformation`);
        const response2 = await axios.get(`${fullHost}/api/blogPost/postComment`);
        const response3 = await axios.get(`${fullHost}/api/blogPost/postLike`);
        const postsDetailAPI = await response1.data;
        const postsCommentAPI = await response2.data;
        const postsLikeAPI = await response3.data;
        const allPostWithcomments = postsDetailAPI.map(function(postDetail){
                postComment = postsCommentAPI.filter(function(postComment){
                return (postComment.postID === postDetail.postID)
            });
            postDetail.postComments = postComment;
            return postDetail;
        });
        const allPostWithcommentsAndLike = allPostWithcomments.map(function(postDetail){
                postLike = postsLikeAPI.filter(function(postLike){
                return (postLike.postID === postDetail.postID)
            });
            postDetail.postLike = postLike;
            return postDetail;
        });
        res.status(200).json(allPostWithcommentsAndLike);
    } catch (error) {
        console.log(error);
    }  

});
//Getting all blog post with all details  code ends

const port = process.env.port;

app.listen(port, function(){
    console.log("Connected to backend");
});