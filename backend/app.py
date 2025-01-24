import json
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import google.generativeai as genai
from sqlalchemy import JSON, create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from langdetect import detect


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
    model_name="gemini-2.0-flash-exp",
    generation_config=generation_config,
    system_instruction="""
        Consider yourself as a barista and coffee expert. You will answer the questions of the customers about coffee and the products in the menu.
        Keep responses concise and under 80 words.
        Always answer in {response_language}. If the user's input is English, respond in English. If it's in Turkish respond in Turkish.
        Never switch languages unless the user explicitly requests it.
        Don't type {response_language} in your answer.
        """,
)

coffee_groups = {
    "000": {"product_ids": [1, 2, 3]},
    "100": {"product_ids": [5, 12, 2]},
    "200": {"product_ids": [3, 7, 11]},
    "010": {"product_ids": [2, 9, 3]},
    "020": {"product_ids": [1, 7, 8]},
    "001": {"product_ids": [4, 10, 5]},
    "002": {"product_ids": [8, 11, 2]},
    "101": {"product_ids": [6, 8, 3]},
    "102": {"product_ids": [11, 2, 7]},
    "201": {"product_ids": [1, 5, 11]},
    "202": {"product_ids": [4, 8, 3]},
    "110": {"product_ids": [6, 10, 7]},
    "120": {"product_ids": [3, 12, 1]},
    "111": {"product_ids": [4, 5, 6]},
    "112": {"product_ids": [5, 2, 8]},
    "121": {"product_ids": [6, 8, 11]},
    "122": {"product_ids": [2, 9, 5]},
    "210": {"product_ids": [1, 11, 3]},
    "220": {"product_ids": [1, 7, 6]},
    "211": {"product_ids": [4, 8, 12]},
    "212": {"product_ids": [12, 2, 7]},
    "221": {"product_ids": [11, 4, 7]},
    "222": {"product_ids": [7, 8, 9]},
}
coffee_products_data = {
    "coffee_products": [
            {"id":1, "name": 'Kenya Muranga Riakiberu', "price": '$18.99', "origin": 'Kenya', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":2, "name": 'Bella Carmona Guatemala', "price": '$16.99', "origin": 'Guatemala', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":3, "name": 'Ethiopia Botabaa', "price": '$17.99', "origin": 'Ethiopia', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":4, "name": 'Ethiopia Yirgacheffe Kochere', "price": '$19.99', "origin": 'Ethiopia', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":5, "name": 'Ethiopian Yirgacheffe Natural', "price": '$20.99', "origin": 'Ethiopia', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":6, "name": 'Ethiopia Kayon Mountain', "price": '$18.99', "origin": 'Ethiopia', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":7, "name": 'Halo Hartume', "price": '$15.99', "origin": 'Ethiopia', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":8, "name": 'Uganda Organic Sipi Falls Honey', "price": '$49.99', "origin": 'Uganda', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":9, "name": "Kenya Thaitu", "price": '$45.99', "origin": 'Kenya', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":10, "name": 'Indian Malabar', "price": '$17.99', "origin": 'India', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":11, "name": 'Vietnamese Robusta', "price": '$14.99', "origin": 'Vietnam', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
            {"id":12, "name": 'Mexican Altura', "price": '$16.99', "origin": 'Mexico', "image": 'https://ideacdn.net/shop/ba/60/myassets/products/249/yellow-blend-min.jpg?revision=1735568298'},
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
        "Affogato",
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


#Endpoints
@app.get("/coffee-groups/{group_id}")
def get_coffee_group_products(group_id: str):
    group = coffee_groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Coffee group not found")

    if "product_ids" not in group:
        raise HTTPException(status_code=404, detail="No products in this group")

    product_ids = group["product_ids"] 
    products = [
        product
        for product in coffee_products_data["coffee_products"]
        if product["id"] in product_ids
    ]
    return {"products": products}

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
    
"""@app.get("/order-status/{order_id}")
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
        raise HTTPException(status_code=500, detail="Failed to retrieve the order status"+ str(e))"""

@app.post("/ask-barista/")
async def ask_barista(question: Question):
    detected_language = detect(question.question)

    response_language = "English" if detected_language == "en" else "Turkish"

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

        result = chat_session.send_message(full_message + json.dumps(coffee_menu_data))
        return {"text": result.text, "language": response_language}

    except Exception as e:
        print(f"Error in ask_barista endpoint: {str(e)}")
        return {"error": "An error occurred while processing your request. Please try again later."}