#!/bin/bash

echo "Choose Git user:"
echo "1. Personal (rahullodiwal8@gmail.com)"
echo "2. Work (rahul.bairwaprpwebs@gmail.com)"
read -p "Enter option (1 or 2): " choice

if [ "$choice" == "1" ]; then
  git config user.name "Rahul-Bairwa"
  git config user.email "rahullodiwal8@gmail.com"
  echo "✅ Set to Personal user (rahullodiwal8@gmail.com)"
elif [ "$choice" == "2" ]; then
  git config user.name "rahulbairwa12"
  git config user.email "rahul.bairwaprpwebs@gmail.com"
  echo "✅ Set to Work user (rahul.bairwaprpwebs@gmail.com)"
else
  echo "❌ Invalid choice. Push aborted."
  exit 1
fi

# Actual push
git push
