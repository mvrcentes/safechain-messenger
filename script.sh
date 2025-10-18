ssh -L 9000:localhost:9000 sonarqube -N

# visitar localhost:9000 en el navegador
# usuario: admin
# contraseña: Super@dm1n2025!


# en la vm 
cd /home/azureuser/actions-runner
./run.sh

# aunque ya deberia de estar automatizado en cada arranque 