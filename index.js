require('dotenv').config()
const express = require('express');
const cors = require('cors');

const multer = require("multer");
const xlsx = require("xlsx");

//------> app <------\\
const app = express();

//------> Server Port <------\\
const port = process.env.PORT || 5000;

//------> middleWare <------\\
app.use(express.json());
app.use(cors());

//------> Root api <------\\
app.get("/", (req, res) => {
    res.send("Job candidate management system Server is Running.....");
})



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `${process.env.DB_URL}`;

// Multer setup
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      const db = client.db("jobCandidateManagement_DB");
      //Collectins
      const usersCollection = db.collection("users");
      const candidatesCollection = db.collection("candidates");

      
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
  // Convert sheet to JSON, skip metadata rows, assign custom header
const rows = xlsx.utils.sheet_to_json(worksheet, {
  header: [
    "SL",
    "Image",
    "Name",
    "Career Summary",
    "Experience And Application Status",
    "Applied On",
    "Remarks"
  ],
  range: 6, 
  defval: "" 
});

    console.log("Rows:", rows); // Debug

    const candidates = rows.map((row, index) => {
      const lines = row.Name ? row.Name.split("\n") : [];

      const profile = {
        name: lines.find(l => l.startsWith("Name:"))?.replace("Name:", "").trim() || "",
        age: parseFloat(lines.find(l => l.startsWith("Age:"))?.replace("Age:", "")) || null,
        location: lines.find(l => l.startsWith("Location:"))?.replace("Location:", "").trim() || "",
        university: lines.find(l => l.startsWith("University:"))?.replace("University:", "").trim() || "",
        degree: lines.find(l => l.startsWith("Degree:"))?.replace("Degree:", "").trim() || "",
        job_matching: lines.find(l => l.includes("%")) || "",
        phone: lines.find(l => l.includes("+")) || "",
        email: lines.find(l => l.includes("@")) || "",
      };

      const career_summary = row["Career Summary"] ? row["Career Summary"].split("\n").map(i => i.trim()) : [];

      const statusLines = row["Experience And Application Status"] ? row["Experience And Application Status"].split("\n") : [];
      const experience_status = {
        total_experience: statusLines.find(l => l.includes("Total Experience"))?.split(":")[1]?.trim() || "",
        salary: statusLines.find(l => l.includes("Salary"))?.split(":")[1]?.trim() || "",
        total_applied: parseInt(statusLines.find(l => l.includes("Total Applied"))?.split(":")[1]) || 0,
      };

      return {
        sl: row.SL || index + 1,
        image: row.Image === "#VALUE!" ? null : row.Image || null,
        profile,
        career_summary,
        experience_status,
        applied_on: row["Applied On"] || "",
        remarks: row.Remarks || "",
        createdAt: new Date(),
      };
    });

    const result = await candidatesCollection.insertMany(candidates);

    res.json({
      message: "Candidates imported successfully",
      insertedCount: result.insertedCount,
    });

  } catch (error) {
    console.error("Excel upload error:", error);
    res.status(500).json({ message: "Excel processing failed" });
  }
});
      
      
// Get all candidates
app.get("/candidates", async (req, res) => {
    try {
        const candidates = await candidatesCollection.find({}).toArray();
        res.send(candidates);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching candidates");
    }
});

 // Users Related api's
  app.post("/users", async (req, res) => {
  try {
    const newUser = req.body;
    const email = newUser.email;
    const isExist = await usersCollection.findOne({ email });

    if (isExist) {
      return res.status(409).send({ message: "User Already Exist!" });
    }

    newUser.createdAt = new Date();
    const result = await usersCollection.insertOne(newUser);

    res.status(201).send({
      message: "User added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    // console.error("Error in POST /users:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});


app.get("/users", async (req, res) => {
  try {

    const result = await usersCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      return res.send(result);
  } catch (error) {
    // console.error("Error in GET /users:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});
      
      
app.get("/users/role", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      const result = await usersCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      return res.send(result);
    }

    const result = await usersCollection.findOne({ email });
    res.send(result);
  } catch (error) {
    // console.error("Error in GET /users:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//------> app listener <------\\
app.listen(port, () => {
    console.log(`Job candidate management system Server is Running Port: ${port}`); 
})
