from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import google.generativeai as genai
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import Session
from dotenv import load_dotenv



load_dotenv()

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CoffeeOrder(Base):
    __tablename__ = "coffee_orders"
    id = Column(Integer, primary_key=True, index=True)
    coffee_type = Column(String)
    coffee_size = Column(String)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash-8b",
    generation_config=generation_config,
    system_instruction="""
        Consider yourself as a barista and coffee expert. You will answer the questions of the customers about coffee and the products in the menu.
        Don't give answers with more than 80 words. Give answers in English or Turkish language.
        """,
)

coffee_products_data = {
    "coffee_products": [
            {"id":1, "name": 'Ethiopian Yirgacheffe', "price": '$18.99', "origin": 'Ethiopia', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":2, "name": 'Colombian Supremo', "price": '$16.99', "origin": 'Colombia' },
            {"id":3, "name": 'Costa Rican Tarrazu', "price": '$17.99', "origin": 'Costa Rica' },
            {"id":4, "name": 'Sumatra Mandheling', "price": '$19.99', "origin": 'Indonesia' },
            {"id":5, "name": 'Kenya AA', "price": '$20.99', "origin": 'Kenya' },
            {"id":6, "name": 'Guatemala Antigua', "price": '$18.99', "origin": 'Guatemala' },
            {"id":7, "name": 'Brazilian Santos', "price": '$15.99', "origin": 'Brazil' },
            {"id":8, "name": 'Jamaica Blue Mountain', "price": '$49.99', "origin": 'Jamaica' },
            {"id":9, "name": "Hawaiian Kona", "price": '$45.99', "origin": 'Hawaii' },
            {"id":10, "name": 'Indian Malabar', "price": '$17.99', "origin": 'India' },
            {"id":11, "name": 'Vietnamese Robusta', "price": '$14.99', "origin": 'Vietnam' },
            {"id":12, "name": 'Mexican Altura', "price": '$16.99', "origin": 'Mexico' }
    ],
}

coffee_menu_data = {
    "coffeeMenu": [
        "Espresso",
        "Latte",
        "Cappuccino",
        "Mocha",
        "Flat White",
        "Lungo",
        "Americano",
        "Filter Coffee",
        "Macchiato",
        "V60",
        "Cortado",
        "Affogato"
    ],
}



class Question(BaseModel):
    question: str
    chat_history: str

class CoffeeOrderCreate(BaseModel):
    coffee_type: str
    coffee_size: str

class CoffeeOrderResponse(BaseModel):
    id: int
    coffee_type: str
    coffee_size: str

class Config:
    orm_mode = True

"""class CoffeeProduct(Base):
    __tablename__ = "coffee_products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    price = Column(Integer)
    origin = Column(String)

class CoffeeProductCreate(BaseModel):
    name: str
    price: int
    origin: str

class CoffeeProductResponse(BaseModel):
    id: int
    name: str
    price: int
    origin: str
    class Config:
        orm_mode = True"""

#Endpoints
@app.get("/coffee-products")
def get_coffee_products():
    return coffee_products_data


@app.get("/coffee-menu/")
def get_coffee_menu():
    return coffee_menu_data

@app.post("/place-order/", response_model= CoffeeOrderResponse)
def place_order(order: CoffeeOrderCreate, db: Session = Depends(get_db)):
    try:
        new_order = CoffeeOrder(
            coffee_type = order.coffee_type,
            coffee_size = order.coffee_size,
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        db.close()
        return new_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to place the order"+ str(e))
    
@app.get("/order-status/{order_id}")
async def get_order_status(order_id: int, db: Session = Depends(get_db)):
    try:
        order = db.query(CoffeeOrder).filter(CoffeeOrder.id == order_id).first()
        db.close()
        if(order):
            return {"status": "Order in progress", "order_details": {
                "coffee_type": order.coffee_type,
                "coffee_size": order.coffee_size,
            }}
        else:
            return {"status": "Order not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve the order status"+ str(e))

@app.post("/ask-barista/")
async def ask_barista(question: Question):
    try:
        # Start a new chat session
        chat_session = model.start_chat()

        # Include chat history if it exists
        if question.chat_history:
            full_message = (
                f"{question.chat_history} "
                f"\n[Based on the previous conversation, here is the context.] "
                f"\n{question.question}"
            )
        else:
            full_message = question.question

        # Send the message and return the result
        result = chat_session.send_message(full_message)
        return {"text": result.text}

    except Exception as e:
        # Log the error (for internal debugging purposes)
        print(f"Error in ask_barista endpoint: {str(e)}")
        return {"error": "An error occurred while processing your request. Please try again later."}