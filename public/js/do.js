function giphyMe() {

request = new XMLHttpRequest;
request.open('GET', 'https://api.giphy.com/v1/gifs/random?api_key=BysL1XP9tPvHjTdmihls99Vm07Gq2yxV&tag=&rating=G', true);

request.onload = function() {
	if (request.status >= 200 && request.status < 400){
		data = JSON.parse(request.responseText).data.image_url;
		console.log(data);
		document.getElementById("giphyme").innerHTML = '<center><img style="width:50%; height:50%" src = "'+data+'"  title="GIF via Giphy"></center>';
	} else {
		console.log('reached giphy, but API returned an error');
	 }
};

request.onerror = function() {
	console.log('connection error');
};

request.send();
};

jQuery(function($){
	"use strict";



	//client side socket.io
	//var socket = io.connect('http://ishuah.com:8080');
	var socket = io.connect();
	var widget = uploadcare.Widget('[role=uploadcare-uploader]');
	var app = {




		init: function(){
			this.list();
			this.actions();
			this.socketActions();
		},

		persist: function(new_todo){

			socket.emit('add', new_todo);
		},

		edit: function(edit_todo){

			socket.emit('edit', edit_todo);
		},

		destroy: function(todo_id){

			socket.emit('delete', { id:todo_id });


		},

		changeStatus: function(todo_id, todo_status){

			socket.emit('changestatus', { id: todo_id, status: todo_status });
		},

		allChangeStatus: function(master_status){

			socket.emit('allchangestatus', { status: master_status });
		},

		actions: function(){
			$('#todo-form').submit(function(){
				if(!$('#new-todo').val()){
					return false;
				}
				var new_todo = {
					title: $('#new-todo').val(),
					file: $('#filecont').val(),
					complete: false
				}
				$('#new-todo').val('');

				app.persist(new_todo);
				console.log(new_todo);
				widget.value(null);
				return false;
			});

			$('button.destroy').live('click', function(e){
				e.preventDefault();
				app.destroy($(this).attr('data-todoId'));
			});

			$('input.toggle').live('click', function(){
				if($(this).prop('checked')){
					app.changeStatus($(this).attr('data-todoId'), 'complete');
				}else{
					app.changeStatus($(this).attr('data-todoId'), 'incomplete');
				}

			});

			$('input#toggle-all').live('click', function(){
				if ($(this).prop('checked')) {
					app.allChangeStatus('complete');
				}else{
					app.allChangeStatus('incomplete');
				}
			});

			$('ul#todo-list li').live('dblclick', function(){
				$(this).addClass('editing');
				$(this).children('input.edit').focus();
			});

			$('input.edit').live('focusout',function(){

				if(!$(this).val()){
					app.destroy($(this).attr('data-todoId'));
				}else{
				$('li#'+$(this).attr('data-todoId')+' .view label').html($(this).val());
				var edit_todo = {
					title: $(this).val(),
					id: $(this).attr('data-todoId')
				}

				app.edit(edit_todo);
				$(this).parent().removeClass('editing');

				}

			});

			$('input.edit').live('keypress', function(e){
				 if(e.which == 13) {
				 	if(!$(this).val()){
						app.destroy($(this).attr('data-todoId'));
					}else{
					 	$('li#'+$(this).attr('data-todoId')+' .view label').html($(this).val());
					 	var edit_todo = {
							title: $(this).val(),
							id: $(this).attr('data-todoId')
						}
						app.edit(edit_todo);
	        			$(this).parent().removeClass('editing');

        			}
    			 }
			});


		},

		socketActions: function(){
			 socket.on('count', function (data) {
			    $('footer#footer').html(data.count+' users online.');
			  });

			 socket.on('added', function(data){
			 	app.addToList(data);
			 });

			 socket.on('deleted', function(data){
			 	app.destroyOnTodoList(data.id);
			 });

			 socket.on('statuschanged', function(data){
			 	app.markOnTodoList(data.id, data.status);
			 });

			 socket.on('edited', function(data){
			 	$('li#'+data._id+' .view label').html(data.title);
			 	$('li#'+data._id+' input.edit').val(data.title);
			 });

			 socket.on('allstatuschanged', function(data){
			 	app.markAllOnTodoList(data.status);
			 });
		},

		list: function(){
			socket.on('all', function(data){
				$('#todo-list').html('');
				for(var i = 0; i< data.length; i++){
					if(data[i].complete){
						$('#todo-list').append('<li id="'+data[i]._id+'"><div class="view"><div class="alert alert-danger"><center><label for="complete">Completo ?</label><input checked data-todoId="'+data[i]._id+'" class="toggle form-check" id="complete" type="checkbox" /></center><hr><h5>'+data[i].title+'</h5><hr><a href="' + ((data[i].file!='')?data[i].file:"https://community.uploadcare.com/uploads/default/original/1X/9474638fb7fb0a01e315ef14e0282a608f9908ee.png") + '" target="_blank">Ir al Archivo</a><hr><center><button onclick="giphyMe()"  data-todoId="'+data[i]._id+'" class="destroy btn btn-warning">Eliminar</button></center></div></li>');

					}else{
						$('#todo-list').append('<li id="'+data[i]._id+'"><div class="view"><div class="alert alert-info"><center><label for="complete">Completo ?</label><input data-todoId="'+data[i]._id+'" class="toggle form-check" id="complete" type="checkbox" /></center><hr><h5>'+data[i].title+'</h5><hr><a href="' + ((data[i].file!='')?data[i].file:"https://community.uploadcare.com/uploads/default/original/1X/9474638fb7fb0a01e315ef14e0282a608f9908ee.png") + '" target="_blank">Ir al Archivo</a><hr><center><button onclick="giphyMe()"  data-todoId="'+data[i]._id+'" class="destroy btn btn-warning">Eliminar</button></center></div></li>');
					}
				}
				app.mainSectionToggle();
			});

		},
		addToList: function(new_todo){
				$('#todo-list').append('<li id="'+new_todo._id+'"><div class="view"><div class="alert alert-info"><center><label for="complete">Completo ?</label><input data-todoId="'+new_todo._id+'" class="toggle form-check" id="complete" type="checkbox" /></center><hr><h5>'+new_todo.title+'</h5><hr><a href="' + ((new_todo.file!='')?new_todo.file:"https://community.uploadcare.com/uploads/default/original/1X/9474638fb7fb0a01e315ef14e0282a608f9908ee.png") + '" target="_blank">Ir al Archivo</a><hr><center><button onclick="giphyMe()"  data-todoId="'+new_todo._id+'" class="destroy btn btn-warning">Eliminar</button></center></div></li>');
				app.mainSectionToggle();
		},
		destroyOnTodoList: function(todo_id){
			$('li#'+todo_id).remove();
			app.mainSectionToggle();
		},

		markOnTodoList: function(todo_id, todo_status){
			if(todo_status == 'complete'){
				$('li#'+todo_id+' div.view div').addClass('alert-danger');
				$('li#'+todo_id+ ' div.view div').removeClass('alert-info');
				$('li#'+todo_id+' div.view input.toggle').attr('checked', true);
			}else{
				$('li#'+todo_id+ ' div.view div').removeClass('alert-danger	');
				$('li#'+todo_id+ ' div.view div').addClass('alert-info	');
				$('li#'+todo_id+' div.view input.toggle').attr('checked', false);
			}

			if($('input#toggle-all').prop('checked')){
				$('input#toggle-all').attr('checked', false);
			}
		},


		mainSectionToggle: function(){
			if(!$('ul#todo-list li').length){
				$('section#main').hide();
				$('footer#footer').hide();
			}else{
				$('section#main').show();
				$('footer#footer').show();
			}
		}
	};

	window.App = app.init();
});
