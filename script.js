'use strict'

const taskForm = document.querySelector('.form')
const inputDistance = document.querySelector('.form__input--distance')
const inputDuration = document.querySelector('.form__input--duration')
const inputCadence = document.querySelector('.form__input--cadence')
const inputElevation = document.querySelector('.form__input--elevation')
const inputType = document.querySelector('.form__input--type')
const taskContainer = document.querySelector('.workouts') 
let workout;
// let map;
// let mapEvent

class Workout{
    //Property
    date = new Date();
    id = (Date.now() + '').slice(-10);
    
    constructor(coords,distance,duration){
        this.coords = coords
        this.distance = distance
        this.duration = duration
    }

    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December'];
        
        //thêm thuộc tính description
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Running extends Workout{
    type = 'running';
    pace;
    constructor(coords,distance,duration,cadence){
        super(coords,distance,duration)
        this.cadence = cadence
        this._setDescription()
        this.calcPace()
    }

    calcPace(){
        this.pace = this.duration / this.distance // min/km
        return this.pace
    }
}

class Cycling extends Workout{
    type = 'cycling';
    speed;
    constructor(coords,distance,duration,elevationGain){
        super(coords,distance,duration)
        this.elevationGain = elevationGain
        this._setDescription()
        this.calcSpeed()
    }

    calcSpeed(){
        this.speed = this.distance / this.duration / 60 // km/h
        return this.speed
    }
}


class App{
    //Property
    #map;
    #mapEvent;
    #workouts = [];
    //Tạo đối tượng sẽ thực hiện constructor ngay lập tức --> load trang sẽ thực hiện constructor
    constructor(){
        this._getPosition()

        //Lấy dữ liệu từ localStorage, list các workout đã tạo trước đó
        this._getLocalStorage()


        //***Nếu không sử dụng .bind(this) thì hàm sẽ xác định this là đối tượng lắng nghe sự kiện chứ không phải đối tượng truy xuất(thể hiện(instance)) --> Dùng khi callback funtion đó có sử dụng this***//
        taskForm.addEventListener('submit',this._newWorkout.bind(this))
        inputType.addEventListener('change', this._toggleElevationFields)
        //Move to marker on click
        taskContainer.addEventListener('click',this._moveToPopup.bind(this))
    }


    // ========= Lấy vị trí hiện tại và render ra map ===== //
    _getPosition(){
        if (navigator.geolocation) {
            //position tương tự như tham số e
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get your positon!')
            })
        }
    }

    _loadMap(position){
        const latitude = position.coords.latitude //vĩ độ
        const { longitude } = position.coords //kinh độ, giải nén thành biến từ object, biến đó phải giống tên trong object
        const coord = [latitude,longitude]

        this.#map = L.map('map').setView(coord, 13); //Set lại tọa độ của mình, 13 là mức độ zoom
        //tileLayer tạo thành từ small tiles đến từ URL là openstreetmap(bản đồ mã nguồn mở)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click',this._showForm.bind(this)) //Sự kiện thuộc về thư viện Leaflex .on , với mapE tương tự như tham số e

        //Dùng cho localStorage --> tải xong map mới hiển thị được marker
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work)
        })
        
    }

    // ========= Show form ===== //
    _showForm(mapE){
        this.#mapEvent = mapE
        taskForm.classList.remove('hidden')
        inputDistance.focus();
    }

    // ========= Hide form ===== //
        
    _hideForm(){
        //Clear input
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = ''

        taskForm.style.display = 'none'
        taskForm.classList.add('hidden')
        setTimeout(function(){
            taskForm.style.display = 'grid'
        },1000)
    }

    //Sự kiện change trên input type
    _toggleElevationFields(){
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    }

    //Move to marker on click
    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout')
        if(!workoutEl) return;

        const workout = this.#workouts.find(workout => workout.id === workoutEl.dataset.id)
        console.log(workout);

        //.setView : move to marker on click
        this.#map.setView(workout.coords,13,{
            animate:true,
            pan: {
                duration: 1,
            }
        })
    }

    // ========= Submit form ===== //
    _newWorkout(e){
        //Submit bằng cách Enter
        e.preventDefault();

        const validInputs = (...inputs) =>  inputs.every(input => Number.isFinite(input))
        const allPositive = (...inputs) => inputs.every(input => input > 0)

        //Lấy dữ liệu từ ô input (Phần chung của running and cycling)
        const type = inputType.value
        const distance = +inputDistance.value
        const duration = +inputDuration.value
        const {lat , lng} = this.#mapEvent.latlng

        //Nếu là running , tạo đối tượng running
        if(type === 'running'){
            const cadence = +inputCadence.value
            if(!validInputs(distance,duration,cadence) || !allPositive(distance,duration,cadence))
                return alert('Inputs have to be positive numbers')
            workout = new Running([lat , lng],distance,duration,cadence)
        }
        //Nếu là cycling , tạo đối tượng cycling
        if(type === 'cycling'){
            const elevation = +inputElevation.value
            if(!validInputs(distance,duration,elevation) || !allPositive(distance,duration))
                return alert('Inputs have to be positive numbers')
            workout = new Cycling([lat , lng],distance,duration,elevation)
        }
        //Thêm đối tượng vào array
        this.#workouts.push(workout)
        //render ra map
        this._renderWorkoutMarker(workout)
        //render ra list workout
        this._renderWorkout(workout)
        //Hide form
        this._hideForm()
        //Lưu vào localStorage
        this._setLocalStorage()
        
    }

    _renderWorkoutMarker(workout){
        //Display marker in map
        // const {lat , lng} = this.#mapEvent.latlng --> Dời lên trên
        // .marker: tạo điểm, .addTo: thêm điểm đó lên bản đồ, .bindPopup: nhãn trên marker
        L.marker(workout.coords).addTo(this.#map) //Set lại tọa độ khi click
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false, //nếu là true thì khi mở cái khác thì popup của cái này sẽ đóng lại
                closeOnClick: false,
                className: `${workout.type}-popup`, //Sử dụng class CSS để nhận style
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout){
        let html =   `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'} </span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>`
        if(workout.type === 'running'){
            html +=    `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`
        }

        if(workout.type === 'cycling'){
            html +=    `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`
        }

        taskForm.insertAdjacentHTML('afterend',html)
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'))
        if(!data) return;
        
        this.#workouts = data
        this.#workouts.forEach(work => {
            this._renderWorkout(work)
        })
    }
    reset(){
        localStorage.removeItem('workouts')
        location.reload()
    }
}

const app = new App();











    


