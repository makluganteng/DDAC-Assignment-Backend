CREATE TABLE "category" (
    "id" SERIAL PRIMARY KEY,
	"category_name" VARCHAR(100) NOT NULL,
	"category_image_url" VARCHAR(250) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE "gift_cards" (
	"id" SERIAL PRIMARY KEY,
	"gift_card_name" VARCHAR(100) NOT NULL,
	"gift_card_price" INTEGER NOT NULL,
	"gift_card_image_url" VARCHAR(250) NOT NULL,
	"category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("category_id") REFERENCES category(id)
);

CREATE TABLE "customer" (
	"id" SERIAL PRIMARY KEY,
	"name" VARCHAR(100) NOT NULL,
	"email" VARCHAR(100) NOT NULL,
	"password" VARCHAR(100) NOT NULL
)