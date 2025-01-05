import React, {useEffect, useLayoutEffect, useRef, useState } from "react"
import "./Chatbot.css";

const sizeOptions = ["Small", "Medium", "Large"];


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
    const [selectedCoffee, setSelectedCoffee] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [coffeeMenu, setCoffeeMenu] = useState([]);
    const [coffeeProducts, setCoffeeProducts] = useState([]);
    const [selectedCoffeeProduct, setSelectedCoffeeProduct] = useState(null);


    useEffect(() => {
        fetch("http://localhost:8000/coffee-menu")
          .then((response) => response.json())
          .then((data) => {
            setCoffeeMenu(data.coffeeMenu || []);
          })
          .catch((error) => console.error("Error fetching coffee menu:", error));
      }, []);

    useEffect(() => {
        fetch("http://localhost:8000/coffee-products")
          .then((response) => response.json())
          .then((data) => {
            setCoffeeProducts(data.coffee_products || []);
            console.log(data.coffee_products[1])
            console.log(data.coffee_products)
          })
          .catch((error) => console.error("Error fetching coffee products:", error));
      }, []);

    const chatWindowRef = useRef(null);

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
            //findYourCoffeeProgram
            setCurrentStep("findCoffeeTaste");
        }else if(option === "Make your custom coffee"){
            //customCoffeeProgram
            setCurrentStep("customCoffee");
        }
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

    const handleCoffeeClick = (coffee) => {
        setSelectedCoffee(coffee === selectedCoffee ? null : coffee);
    };

    const handleLandingPage = (product) => {
        setSelectedCoffeeProduct(product === selectedCoffeeProduct ? null : product);
    }

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
                            <button onClick={() => handleOptionClick("Make your custom coffee")}>Make your custom coffee</button>
                        </div>
                    ) : currentStep === "orderCoffee" ? (
                        <div className="coffee-menu">
                            {coffeeMenu.map((coffee) => (
                                <div className="coffee-item" key={coffee}>
                                    <button 
                                        className= {`coffee-button ${
                                            selectedCoffee === coffee ? "active" : ""
                                        }`}
                                        onClick={() => handleCoffeeClick(coffee)}
                                    >
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
                        {orderActive && (
                                <button className="end-order" onClick={handleEndOrderCoffee}>
                                    End Order
                                </button>
                            )}
                        {selectedCoffee && selectedSize && (
                            <button
                                className="order-button"
                                onClick={() => handleCoffeeSelection(selectedCoffee, selectedSize)}
                            >
                                Order
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
                    /*) : currentStep === "findCoffeeTaste" ? (
                        
                    ) : null}*/
                    ) : null}
                </div>
                
            </div>
            <div>
            {currentStep === "findCoffeeTaste" ? (
                <div className="landing-page">
                    <div className="products-grid">
                        {coffeeProducts.map((product) => (
                            <div className="product-card" key={product}>
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
                ) : null}
        </div>
    </div>
    );
};
export default Chatbot;

