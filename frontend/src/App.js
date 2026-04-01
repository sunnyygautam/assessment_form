import React, { useState } from "react";
import formData from "./form.json";
import "./App.css";
import { useEffect } from "react";
import api from "./api";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";

function App() {
  // console.log("App Loaded ✅");
  const [isAuth, setIsAuth] = useState(false);
  const [step, setStep] = useState(1);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const role = localStorage.getItem("role");
  const isReadOnly = isSubmitted && role !== "appraiser";
  
  // const [draftId, setDraftId] = useState(null);

  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch (err) {
      return true;
    }
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    localStorage.removeItem("token");
    sessionStorage.removeItem("token"); 
    localStorage.removeItem("role");
    sessionStorage.removeItem("role");
    // localStorage.removeItem("step");   // ✅ reset flow

    setIsAuth(false);

    window.location.reload(); // optional but clean reset
  };

  // 🔹 Save Draft API
  const saveDraft = async () => {
    try {
      console.log("Saving Draft..");

      const formPayload = new FormData();

      Object.keys(responses).forEach((key) => {
        const value = responses[key];

        if (value instanceof File) {
          formPayload.append(key, value);
        } else {
          formPayload.append(key, value);
        }
      });

      const res = await api.post("/api/draft", formPayload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      console.log("Draft response:", res.data);

      if (res.status === 200 || res.status === 201) {
        alert("Draft saved");
      }

      const data = res.data.data;

      // ✅ FIXED mapping
      if (data.uploadedFiles?.length > 0) {
        const fileField = formData.section1
          .flatMap(item => item.fields || [])
          .find(field => field.type === "file");

        if (fileField) {
          data[fileField.label] = data.uploadedFiles[0];
        }
      }

      // ✅ FIXED
      setResponses(data);

    } catch (err) {
      console.error("Draft Error:", err);

      if (!err.response) {
        alert("Server not reachable");
      } else if (err.response.data?.message) {
        alert(err.response.data.message);
      } else {
        console.log("Response:", err.response);
        alert("Error saving draft");
      }
    }
  };

  // 🔹 Submit API
  const handleSubmit = async () => {
    try {
      console.log("Form Submitting...");

      const formData = new FormData();

      // Object.keys(responses).forEach((key) => {
      //   formData.append(key, responses[key]);
      // });
      Object.keys(responses).forEach((key) => {
        const value = responses[key];

        if (value instanceof File) {
          formData.append(key, value); // ✅ file
        } else {
          formData.append(key, value); // text
        }
      });

      await api.post("/api/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Form submitted successfully");
      localStorage.removeItem("step");
      setIsSubmitted(true);

    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting form");
    }
  };

  useEffect(() => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) {
      setIsAuth(false);
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem("token");
      setIsAuth(false);
      setLoading(false);
      return;
    }

    setIsAuth(true);

    const fetchDraft = async () => {
      try {
        const res = await api.get("/api/draft");
        const savedStep = localStorage.getItem("step");
        console.log("Draft API:", res.data);

        if (res.data?.data) {
          const data = res.data.data;

          // 🔥 map uploadedFiles to field
          if (data.uploadedFiles?.length > 0) {
            const fileField = formData.section1
              .flatMap(item => item.fields || [])
              .find(field => field.type === "file");

            if (fileField) {
              data[fileField.label] = data.uploadedFiles[0];
            }
          }

          setResponses(data);
          console.log("Final responses:", data);
          
          // setDraftId(res.data.id);
        }

        if (res.data?.status === "submitted") {
          setIsSubmitted(true);
          setStep(2);
        } else if (savedStep) {
          setStep(Number(savedStep));   // ✅ restore step
        } else {
          setStep(1);
        }

      } catch (err) {
        console.error("Draft fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDraft();

  }, [isAuth]);   // 🔥 THIS IS THE FIX

  if (!isAuth) {
    return <Login setAuth={setIsAuth} />;
  }

  if (role === "appraiser") {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (loading) {
    return <h2>Loading data...</h2>;
  }
  
  const handleChange = (key, value) => {
    const updated = { ...responses, [key]: value };
    setResponses(updated);
  };

  if (!formData || !formData.section1) {
    return <h2>Loading form...</h2>;
  }

  const calculateScore = () => {
    let total = 0;
    const keyPrefix = role === "appraiser" ? "appraiser" : "appraisee";

    section2Data.forEach((_, i) => {
      const val = responses[`${keyPrefix}-${i}`];
      if (val) total += Number(val);
    });

    return total;
  };

  const section2Data = [
    {
      title: "JOB KNOWLEDGE (Technical/Subject knowledge of the job)",
      items: [
        { label: "Excellent", desc: "Excellent knowledge as related to the present job, is trying to improve self and mentor others", score: 4 },
        { label: "Good", desc: "Reliable knowledge as related to the present job", score: 3 },
        { label: "Average", desc: "Satisfactory knowledge as related to the present job", score: 2 },
        { label: "Poor", desc: "Poor knowledge as related to the present job", score: 1 }
      ]
    },
    {
      title: "INITIATIVE (Takes actions that are self driven)",
      items: [
        { label: "Excellent", desc: "Takes initiative even when the probability of completing the task is low", score: 4 },
        { label: "Good", desc: "Takes initiative only when the probability of completing the task is high", score: 3 },
        { label: "Average", desc: "Performs the tasks assigned without taking much initiative", score: 2 },
        { label: "Poor", desc: "Does not take any initiative, needs superior's instruction in every task", score: 1 }
      ]
    },
    {
      title: "QUALITY OF WORK (Accuracy and completeness of the job performed)",
      items: [
        { label: "Excellent", desc: "Seldom makes mistakes; excellent quality of work and multitasking", score: 4 },
        { label: "Good", desc: "Careful worker; good quality of work and occasionally multitasking", score: 3 },
        { label: "Average", desc: "Careless at times; makes occasional mistakes in work", score: 2 },
        { label: "Poor", desc: "Generally careless; makes excessive mistakes in work", score: 1 }
      ]
    },
    {
      title: "QUANTITY OF WORK (Volume of output)",
      items: [
        { label: "Excellent", desc: "Always eager & willing to take extra work load including multiskilling", score: 4 },
        { label: "Good", desc: "Good volume of work output and occasional multitasking", score: 3 },
        { label: "Average", desc: "Acceptable output on regular workload only", score: 2 },
        { label: "Poor", desc: "Poor output. Refuses extra workload", score: 1 }
      ]
    },
    {
      title: "COMMUNICATION SKILLS (Communicates ideas and thoughts clearly)",
      items: [
        { label: "Excellent", desc: "Capably articulates ideas and thoughts and makes an impact", score: 4 },
        { label: "Good", desc: "Communicates ideas and thoughts very clearly", score: 3 },
        { label: "Average", desc: "Average communicator; can express ideas and thoughts reasonably well", score: 2 },
        { label: "Poor", desc: "Very poor communicator, cannot convey ideas and thoughts well", score: 1 }
      ]
    },
    {
      title: "RELATIONSHIPS & COOPERATION ATTITUDE WITH COLLEAGUES (Positive Relationships)",
      items: [
        { label: "Excellent", desc: "Excellent relationship with colleagues", score: 4 },
        { label: "Good", desc: "Good relationship with colleagues", score: 3 },
        { label: "Average", desc: "Average relationship with colleagues", score: 2 },
        { label: "Poor", desc: "Poor relationship with colleagues", score: 1 }
      ]
    },
    {
      title: "ATTITUDE WITH PATIENTS / STUDENTS / STAKEHOLDERS",
      items: [
        { label: "Excellent", desc: "Excellent relationship with patients/students/stakeholders", score: 4 },
        { label: "Good", desc: "Good relationship with patients/students/stakeholders", score: 3 },
        { label: "Average", desc: "Average relationship with patients/students/stakeholders", score: 2 },
        { label: "Poor", desc: "Poor relationship with patients/students/stakeholders", score: 1 }
      ]
    },
    {
      title: "ADHERING TO POLICIES, PROTOCOLS, STANDARDS AND ABIDING WITH PREVAILING LAWS",
      items: [
        { label: "Excellent", desc: "Relied upon to adhere to existing systems, taking a lead in enhancing its effectiveness through innovation", score: 4 },
        { label: "Good", desc: "Will adhere to systems and processes for organisational effectiveness", score: 3 },
        { label: "Average", desc: "Has to be repeatedly told to follow the systems and processes laid out by the organization", score: 2 },
        { label: "Poor", desc: "Does not adhere to systems and process laid down by the organisation", score: 1 }
      ]
    },
    {
      title: "PUNCTUALITY (Work timings and output)",
      items: [
        { label: "Excellent", desc: "Is consistently punctual in arriving at work and timely completion of work and assignments", score: 4 },
        { label: "Good", desc: "Most of the time is punctual in arriving at work and usually completes work and assignments in time", score: 3 },
        { label: "Average", desc: "Is often late in arriving at work and delays in accomplishing work and assignments", score: 2 },
        { label: "Poor", desc: "Is very irregular in maintaining punctuality of attendance or accomplishing tasks", score: 1 }
      ]
    },
    {
      title: "INTEGRITY (Honesty, Ethical & Moral Standards)",
      items: [
        { label: "Excellent", desc: "Implicitly trust / above board in work; also will never take advantage of position for personal gain.", score: 4 },
        { label: "Good", desc: "Can be relied on for most work. Do not have to cross check or verify each activity.", score: 3 },
        { label: "Average", desc: "Has to be monitored regularly and often accompanied by another staff for assignments/ work.", score: 2 },
        { label: "Poor", desc: "Cannot be trusted to carry out assignments or deal with others in an honest way.", score: 1 }
      ]
    }
  ];

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
    <div style={{ position: "absolute", right: "20px", top: "20px" }}>
     <button onClick={handleLogout}>Logout</button>
    </div>
      <h2 style={{ textAlign: "center" }}>
        TLMTI STAFF PERFORMANCE ASSESSMENT 2025
      </h2>
      <h3 style={{ textAlign: "center" }}>
        Category: Permanent, Contract & Post Retirement Staff
      </h3>
      <h4 style={{ textAlign: "center" }}>
        (Other than Domain Heads & Unit Heads)
      </h4>
      {isSubmitted && (
      <h5 style={{ color: "red", textAlign: "center" }}>
          🔒 Form already submitted (Read-only mode)
      </h5>
      )}
{(step === 1 || isSubmitted) && (
  <>
	{formData.section1.map((item, index) => {

        // 🔹 SECTION TITLE
        if (item.type === "sectionTitle") {
          return (
            <h3 key={index} style={{ textAlign: "center", marginTop: "20px" }}>
              {item.label}
            </h3>
          );
        }

        // 🔹 INFO TEXT
        if (item.type === "info") {
          return (
            <p key={index} style={{ textAlign: "center", fontSize: "14px" }}>
              {item.label}
            </p>
          );
        }

        // 🔹 ROW (Top fields + Yes/No)
        if (item.type === "row") {
          return (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "20px",
                marginBottom: "15px",
                borderBottom: "1px solid #ccc",
                paddingBottom: "10px"
              }}
            >
              {item.fields.map((field, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <label style={{ fontWeight: "bold", display: "block" }}>
                    {field.label}
                  </label>

                  {/* TEXT */}
                  {field.type === "text" && (
                    <input
                      disabled={
                        isReadOnly ||
                        (field.role === "appraiser" && role !== "appraiser")
                      }
                      type="text"
                      value={responses[field.label] || ""}
                      style={{ 
                        width: "100%",                        
                        // 🔥 Visual indicator
                        background:
                          field.role === "appraiser" && role !== "appraiser"
                            ? "#f5f5f5"
                            : "white"
                      }}
                      onChange={(e) =>
                        handleChange(field.label, e.target.value)
                      }
                    />
                  )}

                  {/* DATE */}
                  {field.type === "date" && (
                    <input
                      disabled={isReadOnly}
                      type="date"
                      value={responses[field.label] || ""}
                      style={{ width: "100%" }}
                      onChange={(e) =>
                        handleChange(field.label, e.target.value)
                      }
                    />
                  )}

                  {/* RADIO */}
                  {field.type === "radio" &&
                    field.options.map((opt, idx) => (
                      <label key={idx} style={{ marginRight: "10px" }}>
                        <input
                          disabled={isReadOnly}
                          type="radio"
                          name={field.label}
                          value={opt}
                          checked={responses[field.label] === String(opt)}
                          onChange={(e) =>
                            handleChange(field.label, e.target.value)
                          }
                        />
                        {opt}
                      </label>
                    ))}

                    {field.type === "file" && (
                      <>
                        <input
                          type="file"
                          disabled={isReadOnly}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              handleChange(field.label, file);
                            }
                          }}
                        />

                        {/* Selected file */}
                        {responses[field.label] instanceof File && (
                          <p style={{ fontSize: "12px", color: "blue" }}>
                            Selected: {responses[field.label].name}
                          </p>
                        )}

                        {/* View file */}
                        {responses[field.label] &&
                          !(responses[field.label] instanceof File) && (
                            <div style={{ marginTop: "5px" }}>
                              <a
                                href={`${process.env.REACT_APP_API_URL}/uploads/${responses[field.label]}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View Uploaded File
                              </a>
                            </div>
                        )}
                      </>
                    )}

                </div>
              ))}
            </div>
          );
        }

        // 🔹 TEXTAREA SECTIONS (A–G)
        // 🔹 TEXTAREA SECTIONS (A–G)
return (
  <div
    key={index}
    style={{
      marginBottom: "20px",
      border: "1px solid #ccc",
      padding: "10px",
      background: "#f9f9f9"
    }}
  >
    <label style={{ fontWeight: "bold" }}>
      {item.question}
    </label>

    {/* 🔥 IF subQuestions exist → ONLY show 1,2,3 inputs */}
    {item.subQuestions ? (
      item.subQuestions.map((sub, i) => (
        <div
          key={i}
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "10px",
            alignItems: "center"
          }}
        >
          <span>{sub}</span>
          <input
            disabled={isReadOnly}
            style={{
              width: "100%",
              border: "none",
              borderBottom: "1px solid black",
              outline: "none"
            }}
            value={responses[`${item.question}-${sub}`] || ""}
            onChange={(e) =>
              handleChange(
                `${item.question}-${sub}`,
                e.target.value
              )
            }
          />
        </div>
      ))
    ) : (
      // 🔹 Normal textarea for other sections
      <textarea
        disabled={
          isReadOnly ||
          (item.role === "appraiser" && role !== "appraiser")
        }
        style={{
          width: "100%",
          minHeight: "80px",
          marginTop: "5px",
          background:
            item.role === "appraiser" && role !== "appraiser"
              ? "#f5f5f5"
              : "white"
        }}
        value={responses[item.question] || ""}
        onChange={(e) =>
          handleChange(item.question, e.target.value)
        }
      />
    )}
  </div>
);
      })}
  {!isSubmitted && (
    <>
      <button
        onClick={saveDraft}
        style={{
          padding: "10px 20px",
          fontSize: "14px",
          marginTop: "20px",
          marginRight: "10px"
        }}
      >
        Save Draft
      </button>

      <button
        onClick={async () => {
          await saveDraft(); //save to db
          setStep(2);
          localStorage.setItem("step", "2");
        }}
        style={{
          padding: "10px 20px",
          fontSize: "14px",
          marginTop: "20px",
          marginRight: "10px"
        }}
      >
        Save & Next
      </button>
    </>
    )}
</>
)}

{(step === 2 || isSubmitted) && (
  <>
    <h3 style={{ textAlign: "center", marginTop: "20px" }}>
      SECTION 2: APPRAISEE & APPRAISER'S ASSESSMENT ON PERFORMANCE
    </h3>
	<p style={{ textAlign: 'center' }}>(To be completed by the Appraisee as well as Appraiser.)</p>

    <table border="1" cellPadding="6" style={{ width: "100%", fontSize: "14px" }}>
      <thead>
        <tr>
          <th>Attributes</th>
          <th>Description</th>
          <th>Score</th>
          <th>Appraisee</th>
          <th>Appraiser</th>
        </tr>
      </thead>

      <tbody>
        {section2Data.map((attr, i) => (
          <React.Fragment key={i}>
            {/* Attribute Title Row */}
            <tr>
              <td colSpan="5" style={{ fontWeight: "bold", background: "#eee" }}>
                {i + 1}. {attr.title}
              </td>
            </tr>

            {/* Description Rows */}
            {attr.items.map((item, j) => (
              <tr key={j}>
                <td>{item.label}</td>
                <td>{item.desc}</td>
                <td style={{ textAlign: "center" }}>{item.score}</td>

                {/* Appraisee */}
                <td style={{ textAlign: "center" }}>
                  <input
                    disabled={
                      isReadOnly ||
                      (role !== "appraisee")
                    }
                    type="radio"
                    name={`appraisee-${i}`}
                    value={item.score}
                    checked={responses[`appraisee-${i}`] === String(item.score)}
                    onChange={(e) =>
                      handleChange(`appraisee-${i}`, e.target.value)
                    }
                  />
                </td>

                {/* Appraiser */}
                <td style={{
                  textAlign: "center",
                  background: role !== "appraiser" ? "#f5f5f5" : "white"
                  }}>
                  <input
                    disabled={
                      isReadOnly ||
                      (role !== "appraiser")
                    }
                    type="radio"
                    name={`appraiser-${i}`}
                    value={item.score}
                    checked={responses[`appraiser-${i}`] === String(item.score)}
                    onChange={(e) =>
                      handleChange(`appraiser-${i}`, e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>

    {/* 🔹 Score */}
    <h3 style={{ marginTop: "20px" }}>
      Grand Total: {calculateScore()} / 40
    </h3>
	<p style={{ textAlign: 'center' }}>Over All Rating (Total Score - 40),
	10 to 15 = POOR,
	16-25 = AVERAGE,
	26-35 = GOOD,
	36 and above  = EXCELLENT</p>

    {/* 🔹 Rating */}
    <h4>
      Rating: {
        calculateScore() <= 15 ? "POOR" :
        calculateScore() <= 25 ? "AVERAGE" :
        calculateScore() <= 35 ? "GOOD" :
        "EXCELLENT"
      }
    </h4>

    {/* 🔹 Navigation */}
    {!isSubmitted && (
      <button
        onClick={() => {
          setStep(1);
          localStorage.setItem("step", "2");
        }} 
        style={{ 
          marginLeft: "10px", 
          padding: "10px 20px", 
          marginTop: "20px" 
        }}
        >
          Back
      </button>
    )}
  {!isSubmitted && (
   <>
    <button
        onClick={saveDraft}
        style={{
          padding: "10px 20px",
          marginTop: "20px",
          marginLeft: "10px"
        }}
      >
        Save Draft
    </button>
    <button
	onClick={handleSubmit}
	// onClick={async () => {
	//     handleSubmit();
  //   }}
	    style={{ marginLeft: "10px", padding: "10px 20px", marginTop: "20px" }}>
      Save & Submit
    </button>
  </>
  )}

  </>
)}
    </div>
  );
}
export default App;
