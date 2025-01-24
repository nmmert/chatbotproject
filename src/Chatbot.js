import React, {useEffect, useLayoutEffect, useRef, useState } from "react"
import "./Chatbot.css";
import coffee_icon from './assets/cup-of-hot-chocolate.png';

const sizeOptions = ["Small", "Medium", "Large"];

const questions = [
    {
        question: "Which method do you use to brew coffee?",
        answers: [
            "Espresso / Mokapot / Aeropress",
            "Filter / French Press",
            "V60 / Chemex",
        ],
    },
    {
        question: "Do you use milk with your coffee?",
        answers: [
            "Never, I like my coffee black",
            "Sometimes",
            "Always, I can’t drink my coffee without milk",
        ],
    },
    {
        question: "Which natural flavors do you prefer?",
        answers: [
            "Caramel, Chocoalte, Nutty",
            "Fruity, Floral, Citrus",
            "Spicy, Earthy, Herbal",
        ],
    },
];


const Chatbot = () => {
    const [messages, setMessages] = useState([
        { sender: "Bot", text: "Welcome to the Smart Coffee Assistant!" },
    ]);

    //States
    const [currentStep, setCurrentStep] = useState("start");
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState();
    const [askBaristaActive, setaskBaristaActive] = useState(false);
    const [orderActive, setOrderActive] = useState(false);
    const [findCoffeeTasteActive, setFindCoffeeTasteActive] = useState(false);
    const [selectedCoffee, setSelectedCoffee] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [coffeeMenu, setCoffeeMenu] = useState([]);

    const [selectedCoffeeProduct, setSelectedCoffeeProduct] = useState(null);

    const [quizStep, setQuizStep] = useState(0);
    const [answers, setAnswers] = useState(["", "", ""]);
    const [result, setResult] = useState(null);
    



    useEffect(() => {
        fetch("http://localhost:8000/coffee-menu")
          .then((response) => response.json())
          .then((data) => {
            setCoffeeMenu(data.coffeeMenu || []);
          })
          .catch((error) => console.error("Error fetching coffee menu:", error));
      }, []);
      

    const addMessage = (sender, text) => {
        setMessages((prevMessages) => [...prevMessages, {sender, text}]);
        setChatHistory(chatHistory+" "+text);
    };

    const handleOptionClick = (option) => {
        addMessage("You", option);

        if(option === "Order a coffee"){
            setCurrentStep("orderCoffee");
            setOrderActive(true);
        }else if(option === "Ask the barista"){
            setCurrentStep("askBarista");
            setaskBaristaActive(true);
        }else if(option === "Find your taste of coffee"){
            setCurrentStep("findCoffeeTaste");
        }
    };

    const handleAnswerSelect = (answerIndex) => {
        const updatedAnswers = [...answers];
        updatedAnswers[quizStep] = answerIndex.toString();
        setAnswers(updatedAnswers);
        setFindCoffeeTasteActive(true);

        if (quizStep < questions.length - 1) {
            setQuizStep(quizStep + 1);
        } else {
            fetchCoffeeGroup(updatedAnswers.join(""));
        }
    };

    const fetchCoffeeGroup = async (answerKey) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/coffee-groups/${answerKey}`);
            if (response.ok) {
                const data = await response.json();
                setResult(data.products);
            } else {
                console.error("Failed to fetch coffee group");
                setResult({error: "Unable to find coffee group"});
            }
        } catch (error) {
            console.error("Error fetching coffee group:", error);
            setResult({error: "An error occurred while fetching coffee group"});
        }
        finally {
            setLoading(false);
        }
    };

    const restartQuiz = () => {
        setQuizStep(0);
        setAnswers(["", "", ""]);
        setResult(null);
    };

    const handleCoffeeClick = (coffee) => {
        setSelectedCoffee(coffee === selectedCoffee ? null : coffee);
    };

    const handleCoffeeSelection = async (coffee, coffeeSize) => {
        if(selectedCoffee === null || selectedSize === null){
            alert("Please select coffee size and sugar level");
            return;
        }
        const order = {
            coffee_type: coffee,
            coffee_size: coffeeSize,
            coffee: selectedCoffee,
        }
        try{
            const response = await fetch("http://localhost:8000/place-order/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(order),
            });
            if (response.ok) {
                addMessage("Bot", "Your order will be ready in a short time. Thank you!");
                setCurrentStep("start");
                setSelectedCoffee(null);
                setSelectedSize(null);
            }else{
                addMessage("Bot", "Failed to place the order. Please try again.");
                console.error("Error placing order", await response.text());
            }
        }catch (error){
            addMessage("Bot", "An error occurred while placing the order. Please try again.");
            console.error(error);
        }
    };

    const handleEndQuiz = () => {
        setMessages([{ sender: "Bot", text: "Welcome to the Smart Coffee Assistant!" }]);
        setCurrentStep("start");
        setFindCoffeeTasteActive(false);
        setAnswers(["", "", ""]);
        setResult(null);
    };

    const handleEndOrderCoffee = () => {
        setMessages([{ sender: "Bot", text: "Welcome to the Smart Coffee Assistant!" }]);
        setCurrentStep("start");
        setOrderActive(false);
    }

    const handleAskBarista = async (userQuestion) => {
        addMessage("You", userQuestion);

        setLoading(true);

        try{
            const response = await fetch("http://localhost:8000/ask-barista", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question: userQuestion,
                    chat_history: chatHistory,
            }),
            });
            if (response.ok) {
                const data = await response.json();
                setChatHistory(data.conversation);
                addMessage("Barista", data.text);
            }
        } catch (error){
            addMessage("Bot", "Sorry, Something went wrong. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    const handleEndConversation = () => {
            setMessages([{ sender: "Bot", text: "Welcome to the Smart Coffee Assistant!" }]);
            setCurrentStep("start");
            setaskBaristaActive(false);
            setChatHistory([]);
        }

    const handleInputKeyDown = (e) => {
        if (e.key === "Enter" && e.target.value.trim()) {
            const userQuestion = e.target.value.trim();
            e.target.value = "";
            handleAskBarista(userQuestion);
        }
    };

    

    const handleLandingPage = (product) => {
        setSelectedCoffeeProduct(product === selectedCoffeeProduct ? null : product);
    }

    const chatWindowRef = useRef(null);

    useLayoutEffect(() => {
        if (chatWindowRef.current){
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);


    return (
        <div>
            <div className="chatbot">
                <div className="chat-window" ref={chatWindowRef}>
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>
                            <strong>{msg.sender}:</strong> {msg.text}
                        </div>
                    ))}
                    {loading && (
                        <div className="message Barista">
                            <strong>Barista is thinking...</strong>
                        </div>
                    )}
                </div>
                <div className="chat-input">
                    {currentStep === "start" ? (
                        <div className="button-options">
                            <button onClick={() => handleOptionClick("Order a coffee")}>Order a coffee</button>
                            <button onClick={() => handleOptionClick("Ask the barista")}>Ask the barista</button>
                            <button onClick={() => handleOptionClick("Find your taste of coffee")}>Find your taste of coffee</button>
                        </div>
                    ) : currentStep === "orderCoffee" ? (
                        <div className="coffee-menu">
                            {coffeeMenu.map((coffee) => (
                                <div className="coffee-item" key={coffee}>
                                    <button 
                                        className={`coffee-button ${
                                            selectedCoffee === coffee ? "active" : ""
                                        }`}
                                        onClick={() => handleCoffeeClick(coffee)}
                                    >
                                        <img className="coffee-image" src={coffee_icon} alt={coffee} />
                                        {coffee}
                                    </button>
                                    {selectedCoffee === coffee && (
                                        <div className="size-options">
                                            {sizeOptions.map((size) => (
                                                <button
                                                    key={size}
                                                    className={`size-button ${
                                                    selectedSize === size ? "active" : ""
                                                    }`}
                                                    onClick={() => setSelectedSize(size)}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {selectedCoffee && selectedSize && (
                                <button
                                    className="order-button"
                                    onClick={() => handleCoffeeSelection(selectedCoffee, selectedSize)}
                                >
                                    Order
                                </button>
                            )}
                            {orderActive && (
                                <button className="end-order" onClick={handleEndOrderCoffee}>
                                    End Order
                                </button>
                            )}
                        </div>
                    ) : currentStep === "askBarista" ? (
                        <>
                            <input
                                type="text"
                                placeholder="Ask the barista a question"
                                onKeyDown={handleInputKeyDown}
                            />
                            {askBaristaActive && (
                                <button className="end-conversation" onClick={handleEndConversation}>
                                    End the Conversation
                                </button>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
            <div>
            {currentStep === "findCoffeeTaste" ? (
                <div className="quiz-container">
                    {!result ? (
                        <>
                            <h3 className="question-header">{questions[quizStep].question}</h3>
                            <div className="answers">
                                {questions[quizStep].answers.map((answer, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswerSelect(index)}
                                        className="answer-button"
                                    >
                                        {answer}
                                    </button>
                                ))}
                            </div>
                            {findCoffeeTasteActive && (
                                <button className="end-quiz" onClick={handleEndQuiz}>
                                    End Quiz
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="result-container">
                            {loading ? (
                                <p>Loading your coffee group...</p>
                            ) : result.error ? (
                                <p>{result.error}</p>
                            ) : (
                                <div>
                                    <h3>Your Coffee Group: </h3>
                                    <div className="landing-page">
                                        {result?.map((product) => (
                                                <div className="product-card" key={product.id}>
                                                <button
                                                    className={`product-card-button ${
                                                        selectedCoffeeProduct === product ? "active" : ""
                                                }`}
                                                onClick={() => handleLandingPage(product)}
                                                >
                                                    <h3>{product.name}</h3>
                                                    <div className="product-image">
                                                        <img src={product.image} alt={product.name} />
                                                    </div>
                                                    <div className="product-details">
                                                        <p className="bean-origin">{product.origin}</p>
                                                        <p className="bean-price">{product.price}</p>
                                                    </div>
                                                </button>
                                            </div>
                                            ))}                                  
                                            
                                    </div>
                                </div>
                            )}
                            <button onClick={restartQuiz} className="restart-button">
                                Restart Quiz
                            </button>
                        </div>
                    )}
                </div>
            ) : null}
    
        </div>
    </div>
    );
    
};
export default Chatbot;

